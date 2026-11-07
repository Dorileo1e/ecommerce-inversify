import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '../container/types';
import { ProductData } from '../domain/IProduct';
import { IProductRepository } from './IProductRepository';

@injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(@inject(TYPES.PrismaClient) private prisma: PrismaClient) {}

  findById(id: number): Promise<ProductData | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }
}
