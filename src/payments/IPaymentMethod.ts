export interface IPaymentMethod {
  readonly name: string;
  process(total: number, details: any): Promise<void>;
}
