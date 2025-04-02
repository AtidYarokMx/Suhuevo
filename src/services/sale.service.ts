import { CreateSaleDto, FilterSaleDto, SaleBoxDetailDto, SalePaymentDto } from "@app/dtos/sale.dto";
import { BoxProductionModel } from "@app/repositories/mongoose/models/box-production.model";
import { ClientModel } from "@app/repositories/mongoose/models/client.model";
import { InventoryModel } from "@app/repositories/mongoose/models/inventory.model";
import { SaleModel } from "@app/repositories/mongoose/schemas/sale.schema";
import { Types } from "mongoose";


export const generateFolio = (prefix: string = 'SALE'): string => {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hms = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${prefix}-${ymd}-${hms}`;
};

export const createSaleFromInventory = async (dto: CreateSaleDto, user: any) => {
  const codes = dto.codes;

  // Obtener las cajas con tipo y categoría poblada
  const boxes = await BoxProductionModel.find({
    code: { $in: codes },
    status: 4,
  })
    .populate([
      {
        path: 'type',
        populate: {
          path: 'category',
          model: 'box-category'
        }
      }
    ])
    .lean();

  if (boxes.length !== codes.length) {
    throw new Error('Algunos códigos no están disponibles en el inventario de ventas (recibido)');
  }

  const enrichedBoxes: SaleBoxDetailDto[] = boxes.map((box) => {
    const type = box.type as any;
    const category = type.category as any;
    const categoryId = category?._id?.toString();
    const unitPrice = dto.pricesByCategory?.[categoryId];

    if (!unitPrice) {
      throw new Error(`No se definió precio para la categoría: ${category?.name ?? 'desconocida'}`);
    }

    return {
      code: box.code,
      type: type.name,
      weightKg: box.netWeight,
      unitPrice,
    };
  });

  const totalBoxes = enrichedBoxes.length;
  const totalKg = enrichedBoxes.reduce((sum, b) => sum + b.weightKg, 0);
  const subtotal = enrichedBoxes.reduce((sum, b) => sum + b.weightKg * b.unitPrice, 0);
  const iva = subtotal * 0.16;
  const totalWithIva = subtotal + iva;
  const pricePerKg = subtotal / totalKg;

  const client = await ClientModel.findById(dto.clientId);
  if (!client) throw new Error('Cliente no encontrado');

  if (dto.paymentType === 'credito') {
    if (client.creditLimit === undefined) {
      throw new Error('El límite de crédito del cliente no está definido');
    }
    const availableCredit = client.creditLimit - (client.creditUsed ?? 0);
    if (totalWithIva > availableCredit) {
      throw new Error('El cliente no tiene suficiente crédito disponible');
    }
    client.creditUsed = (client.creditUsed ?? 0) + totalWithIva;
    await client.save();
  }

  const folio = generateFolio('SALE');

  const sale = await SaleModel.create({
    saleDate: new Date(),
    dueDate: dto.paymentType === 'credito' ? dto.dueDate : undefined,
    clientId: new Types.ObjectId(dto.clientId),
    sellerUserId: new Types.ObjectId(user._id),
    folio,
    boxDetails: enrichedBoxes,
    totalBoxes,
    totalKg,
    pricePerKg,
    subtotal,
    iva,
    totalWithIva,
    amountPaid: 0,
    amountPending: totalWithIva,
    paymentType: dto.paymentType,
    paymentMethod: dto.paymentMethod,
    reference: folio,
  });

  // Actualizar estatus de las cajas a "Vendido" (5)
  await BoxProductionModel.updateMany(
    { code: { $in: codes } },
    { $set: { status: 5 } }
  );

  return sale;
};

export const createSaleFromShipment = async (dto: CreateSaleDto, user: any) => {
  const codes = dto.codes;

  // Obtener las cajas que estén en tránsito (3) o recibidas (4)
  const boxes = await BoxProductionModel.find({
    code: { $in: codes },
    status: { $in: [3, 4] }, // Tránsito o Recibido
  })
    .populate([
      {
        path: 'type',
        populate: {
          path: 'category',
          model: 'box-category',
        },
      },
    ])
    .lean();

  if (boxes.length !== codes.length) {
    throw new Error('Algunos códigos no están disponibles en el estado permitido para venta');
  }

  // Validar y construir detalle por categoría
  const enrichedBoxes: SaleBoxDetailDto[] = boxes.map((box) => {
    const type = box.type as any;
    const category = type.category as any;
    const categoryId = category?._id?.toString();
    const unitPrice = dto.pricesByCategory?.[categoryId];

    if (!unitPrice) {
      throw new Error(`No se definió precio para la categoría: ${category?.name ?? 'desconocida'}`);
    }

    return {
      code: box.code,
      type: type.name,
      weightKg: box.netWeight,
      unitPrice,
    };
  });

  const totalBoxes = enrichedBoxes.length;
  const totalKg = enrichedBoxes.reduce((sum, b) => sum + b.weightKg, 0);
  const subtotal = enrichedBoxes.reduce((sum, b) => sum + b.weightKg * b.unitPrice, 0);
  const iva = subtotal * 0.16;
  const totalWithIva = subtotal + iva;
  const pricePerKg = subtotal / totalKg;

  const client = await ClientModel.findById(dto.clientId);
  if (!client) throw new Error('Cliente no encontrado');

  if (dto.paymentType === 'credito') {
    if (client.creditLimit === undefined) {
      throw new Error('El límite de crédito del cliente no está definido');
    }
    const availableCredit = client.creditLimit - (client.creditUsed ?? 0);
    if (totalWithIva > availableCredit) {
      throw new Error('El cliente no tiene suficiente crédito disponible');
    }
    client.creditUsed = (client.creditUsed ?? 0) + totalWithIva;
    await client.save();
  }

  const folio = generateFolio('SALE');

  const sale = await SaleModel.create({
    saleDate: new Date(),
    dueDate: dto.paymentType === 'credito' ? dto.dueDate : undefined,
    clientId: new Types.ObjectId(dto.clientId),
    sellerUserId: new Types.ObjectId(user._id),
    folio,
    boxDetails: enrichedBoxes,
    totalBoxes,
    totalKg,
    pricePerKg,
    subtotal,
    iva,
    totalWithIva,
    amountPaid: 0,
    amountPending: totalWithIva,
    paymentType: dto.paymentType,
    paymentMethod: dto.paymentMethod,
    reference: `REF-${folio}`, // generado automáticamente
  });

  // ✅ Actualizar estado a vendido
  await BoxProductionModel.updateMany(
    { code: { $in: codes } },
    { $set: { status: 5 } }
  );

  return sale;
};


export const getAllSales = async (filters: FilterSaleDto = {}) => {
  const query: any = {};

  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.status) query.status = filters.status;
  if (filters.folio) query.folio = { $regex: filters.folio, $options: 'i' };
  if (filters.paymentType) query.paymentType = filters.paymentType;
  if (filters.from || filters.to) {
    query.saleDate = {};
    if (filters.from) query.saleDate.$gte = filters.from;
    if (filters.to) query.saleDate.$lte = filters.to;
  }

  return await SaleModel.find(query).sort({ saleDate: -1 });
};

export const getSaleDetails = async (saleId: string) => {
  const sale = await SaleModel.findById(saleId);
  if (!sale) throw new Error('Venta no encontrada');
  return sale;
};

export const registerPayment = async (saleId: string, dto: SalePaymentDto, user: any) => {
  const sale = await SaleModel.findById(saleId);
  if (!sale) throw new Error('Venta no encontrada');

  if (sale.status === 'pagado') {
    throw new Error('La venta ya ha sido liquidada.');
  }

  sale.payments.push({
    date: new Date(),
    amount: dto.amount,
    method: dto.method,
    reference: dto.reference,
    userId: user._id,
  });

  sale.amountPaid += dto.amount;
  sale.amountPending = sale.totalWithIva - sale.amountPaid;

  if (sale.amountPending <= 0) {
    sale.status = 'pagado';
  }

  await sale.save();

  return sale;
};

export const getOverdueSales = async () => {
  const today = new Date();

  return await SaleModel.find({
    paymentType: 'credito',
    status: 'pendiente',
    dueDate: { $lt: today },
  }).sort({ dueDate: 1 });
};