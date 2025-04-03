// DTO para los detalles por caja incluida en la venta
export interface SaleBoxDetailDto {
  code: string;
  type: string;
  weightKg: number;
  unitPrice: number;
}

// DTO para crear una nueva venta
export interface CreateSaleDto {
  clientId: string;
  codes: string[]; // solo códigos de cajas
  pricesByCategory: Record<string, number>; // { categoryId: precio }
  paymentType: 'credito' | 'contado';
  paymentMethod: 'efectivo' | 'transferencia' | 'deposito';
  reference?: string;
  dueDate?: Date;
}

// DTO para filtrar ventas (en reportes o vistas administrativas)
export interface FilterSaleDto {
  clientId?: string;
  status?: 'pendiente' | 'pagado' | 'cancelado';
  from?: Date;
  to?: Date;
  folio?: string;
  paymentType?: 'credito' | 'contado';
}

// DTO para registrar un nuevo pago parcial o total
export interface SalePaymentDto {
  saleId: string;
  amount: number;
  method: 'efectivo' | 'transferencia' | 'deposito';
  reference?: string;
  invoiceId?: string;
  invoiceComplementId?: string;
  cfdiUuid?: string;
}
