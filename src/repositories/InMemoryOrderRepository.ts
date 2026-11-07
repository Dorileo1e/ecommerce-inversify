import { injectable } from 'inversify';
import { Order, OrderLine } from '../domain/Order';
import { IOrderRepository } from './IOrderRepository';

/**
 * Modo test: guarda os pedidos num array, sem banco de dados.
 * Os pedidos duram enquanto a aplicação estiver rodando (some ao reiniciar).
 */
@injectable()
export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Order[] = [];
  private nextId = 1;

  async create(customer: string, items: OrderLine[], total: number): Promise<Order> {
    const order: Order = { id: this.nextId++, customer, items, total, status: 'confirmed' };
    this.orders.push(order);
    return order;
  }
}
