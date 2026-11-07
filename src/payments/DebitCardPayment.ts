import { injectable } from 'inversify';
import logger from '../lib/logger';
import { ValidationError } from '../domain/errors';
import { IPaymentMethod } from './IPaymentMethod';

@injectable()
export class DebitCardPayment implements IPaymentMethod {
  readonly name = 'debit_card';

  async process(total: number, details: any): Promise<void> {
    if (!details?.cardNumber) throw new ValidationError('Dados do cartão ausentes');

    logger.info(`Débito de R$ ${total} no cartão final ${details.cardNumber.slice(-4)}`);
  }
}
