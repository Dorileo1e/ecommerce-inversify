import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';
import { TYPES } from './types';
import { OrderController } from '../controllers/OrderController';
import { OrderService } from '../services/OrderService';
import { NotificationService } from '../services/NotificationService';
import { IProductRepository } from '../repositories/IProductRepository';
import { IOrderRepository } from '../repositories/IOrderRepository';
import { PrismaProductRepository } from '../repositories/PrismaProductRepository';
import { PrismaOrderRepository } from '../repositories/PrismaOrderRepository';
import { InMemoryOrderRepository } from '../repositories/InMemoryOrderRepository';
import { IMailProvider } from '../providers/IMailProvider';
import { EtherealMailProvider } from '../providers/EtherealMailProvider';
import { ConsoleMailProvider } from '../providers/ConsoleMailProvider';
import { IPaymentMethod } from '../payments/IPaymentMethod';
import { PaymentMethodRegistry } from '../payments/PaymentMethodRegistry';
import { CreditCardPayment } from '../payments/CreditCardPayment';
import { DebitCardPayment } from '../payments/DebitCardPayment';
import { PixPayment } from '../payments/PixPayment';

/**
 * ÚNICO arquivo que conhece as classes concretas e que decide o modo de execução.
 * Nenhum service ou controller lê o APP_ENV nem importa Prisma, Nodemailer ou implementações.
 */
export type AppEnv = 'dev' | 'test';

/** Lê o APP_ENV. Sem valor (ex.: .env ausente) usa "dev"; valor desconhecido é erro. */
export function resolveAppEnv(raw: string | undefined = process.env.APP_ENV): AppEnv {
  const value = raw?.trim().toLowerCase() || 'dev';
  if (value === 'dev' || value === 'test') return value;
  throw new Error(`APP_ENV inválido: "${raw}". Use "dev" ou "test".`);
}

// ---- O que muda entre os modos: apenas e-mail e repositório de pedidos ----
const bindInfrastructureByEnv: Record<AppEnv, (container: Container) => void> = {
  dev: (container) => {
    container.bind<IMailProvider>(TYPES.MailProvider).to(EtherealMailProvider).inSingletonScope();
    container.bind<IOrderRepository>(TYPES.OrderRepository).to(PrismaOrderRepository).inSingletonScope();
  },
  test: (container) => {
    container.bind<IMailProvider>(TYPES.MailProvider).to(ConsoleMailProvider).inSingletonScope();
    container.bind<IOrderRepository>(TYPES.OrderRepository).to(InMemoryOrderRepository).inSingletonScope();
  },
};

export function createContainer(appEnv: AppEnv = resolveAppEnv()): Container {
  const container = new Container();

  // ---- Igual nos dois modos ----
  container
    .bind<PrismaClient>(TYPES.PrismaClient)
    .toDynamicValue(() => new PrismaClient())
    .inSingletonScope();
  container.bind<IProductRepository>(TYPES.ProductRepository).to(PrismaProductRepository).inSingletonScope();

  // Todas as formas de pagamento usam o mesmo identificador e chegam juntas ao registro (@multiInject).
  container.bind<IPaymentMethod>(TYPES.PaymentMethod).to(CreditCardPayment);
  container.bind<IPaymentMethod>(TYPES.PaymentMethod).to(DebitCardPayment);
  container.bind<IPaymentMethod>(TYPES.PaymentMethod).to(PixPayment);
  container.bind<PaymentMethodRegistry>(TYPES.PaymentMethodRegistry).to(PaymentMethodRegistry);

  container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService);
  container.bind<OrderService>(TYPES.OrderService).to(OrderService);
  container.bind<OrderController>(TYPES.OrderController).to(OrderController);

  // ---- Específico do modo ----
  bindInfrastructureByEnv[appEnv](container);

  logger.info(`Container montado no modo "${appEnv}"`);
  return container;
}

export const container = createContainer();

/** Atalho tipado para o app.ts pedir o controller sem importar classes concretas. */
export function getOrderController(): OrderController {
  return container.get<OrderController>(TYPES.OrderController);
}
