import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose';

const PaymentSchema = new Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['efectivo', 'transferencia', 'deposito'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invoiceComplementId: {
      type: String,
      trim: true,
    },
    cfdiUuid: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    saleDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    sellerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    folio: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    boxDetails: [
      {
        code: { type: String, required: true },
        type: { type: String, required: true },
        weightKg: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
      },
    ],
    totalBoxes: {
      type: Number,
      required: true,
      min: 0,
    },
    totalKg: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    iva: {
      type: Number,
      required: true,
      min: 0,
    },
    totalWithIva: {
      type: Number,
      required: true,
      min: 0,
    },

    // Estado financiero
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPending: {
      type: Number,
      required: true,
      min: 0,
    },

    // Tipo de pago y método
    paymentType: {
      type: String,
      enum: ['credito', 'contado'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['efectivo', 'transferencia', 'deposito'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },

    // Factura principal
    invoiceId: {
      type: String,
      trim: true,
    },
    invoiceStatus: {
      type: String,
      enum: ['pendiente', 'emitida', 'cancelada'],
      default: 'pendiente',
    },
    cfdiUuid: {
      type: String,
      trim: true,
    },

    // Pagos parciales
    payments: [PaymentSchema],

    // Estado general de la venta
    status: {
      type: String,
      enum: ['pendiente', 'pagado', 'cancelado'],
      default: 'pendiente',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

export const SaleModel = AppMainMongooseRepo.model('sales', SaleSchema);
