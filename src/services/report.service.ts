import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model';
import { WeeklyRecordModel } from '@app/repositories/mongoose/models/weeklyRecord.model';
import { SaleModel } from '@app/repositories/mongoose/schemas/sale.schema';
import { getAdminWeekRange } from '@app/utils/date.util';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { Response as ExpressResponse } from 'express';
import PDFDocument from 'pdfkit';

// Interfaces
interface ReportFilters {
  from: Date;
  to: Date;
}

// 🚀 Generar producción semanal o histórica
type FilterOptions = { currentWeekOnly?: boolean };

export const generateProductionReport = async (
  shedId: string,
  filter: FilterOptions,
  res: ExpressResponse,
  fileName: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Producción');

  worksheet.columns = [
    { header: 'Caseta', key: 'shed', width: 20 },
    { header: 'Inicio Semana', key: 'weekStart', width: 15 },
    { header: 'Fin Semana', key: 'weekEnd', width: 15 },
    { header: 'Huevos Producidos', key: 'eggsProduced', width: 20 },
    { header: 'Cajas Producidas', key: 'boxesProduced', width: 20 },
    { header: 'Gallinas Muertas', key: 'deadHens', width: 20 },
    { header: 'Alimento Consumido (Kg)', key: 'foodConsumed', width: 20 }
  ];

  let query = WeeklyRecordModel.find({ shed: new mongoose.Types.ObjectId(shedId) })
    .populate({ path: 'shedId', select: 'name' })
    .lean();

  if (filter.currentWeekOnly) {
    const { weekStart, weekEnd } = getAdminWeekRange();
    query = query.where('weekStart').gte(weekStart.getTime()).lte(weekEnd.getTime());
  }

  const production = await query;
  const boxes = await BoxProductionModel.find({ shed: new mongoose.Types.ObjectId(shedId) }).lean();

  const rows = production.map(p => {
    const boxesProduced = boxes.reduce((sum, box) => sum + (Number(box.totalEggs) || 0), 0);
    const shedName = typeof p.shedId === 'object' && 'name' in p.shedId ? p.shedId.name : 'Unknown';
    return {
      shed: shedName,
      weekStart: new Date(p.weekStart).toISOString().split('T')[0],
      weekEnd: new Date(p.weekEnd).toISOString().split('T')[0],
      eggsProduced: p.totalProducedEggs ?? 0,
      boxesProduced,
      deadHens: p.totalMortality ?? 0,
      foodConsumed: p.totalFoodConsumedKg ?? 0
    };
  });

  worksheet.addRows(rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
};

export const generateWeeklyProductionReport = async (shedId: string, res: ExpressResponse): Promise<void> => {
  return generateProductionReport(shedId, { currentWeekOnly: true }, res, 'weekly_production.xlsx');
};

export const generateHistoricalProductionReport = async (shedId: string, res: ExpressResponse): Promise<void> => {
  return generateProductionReport(shedId, {}, res, 'historical_production.xlsx');
};

export const generateDailySalesReport = async (
  filters: ReportFilters,
  format: 'excel' | 'pdf',
  res: ExpressResponse
): Promise<void> => {
  const sales = await SaleModel.find({
    saleDate: { $gte: filters.from, $lte: filters.to },
  }).lean();

  if (!sales.length) {
    throw new Error('No hay ventas en el rango de fechas.');
  }

  const classificationSummary: Record<string, { count: number; totalGrossWeight: number; totalNetWeight: number }> = {};

  for (const sale of sales) {
    for (const box of sale.boxDetails) {
      const existing = classificationSummary[box.type] ?? { count: 0, totalGrossWeight: 0, totalNetWeight: 0 };
      classificationSummary[box.type] = {
        count: existing.count + 1,
        totalGrossWeight: existing.totalGrossWeight + (box.weightKg * 1.05),
        totalNetWeight: existing.totalNetWeight + box.weightKg,
      };
    }
  }

  const reportData = Object.entries(classificationSummary).map(([classification, data]) => ({
    classification,
    boxes: data.count,
    grossWeight: Number(data.totalGrossWeight.toFixed(2)),
    netWeight: Number(data.totalNetWeight.toFixed(2))
  }));

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ventas Diarias");

    worksheet.columns = [
      { header: "Clasificación", key: "classification", width: 20 },
      { header: "Cajas", key: "boxes", width: 10 },
      { header: "Peso Bruto (Kg)", key: "grossWeight", width: 15 },
      { header: "Peso Neto (Kg)", key: "netWeight", width: 15 },
    ];

    worksheet.addRows(reportData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas-diarias.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } else if (format === 'pdf') {
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas-diarias.pdf"');

    doc.pipe(res);

    doc.fontSize(18).text('Reporte de Ventas por Clasificación', { align: 'center' });
    doc.moveDown();

    reportData.forEach(r => {
      doc.fontSize(12).text(`${r.classification} - Cajas: ${r.boxes} - Peso Bruto: ${r.grossWeight}kg - Peso Neto: ${r.netWeight}kg`);
    });

    doc.end();
  }
};

// 🧾 Generar nota de remisión (PDF por venta)
export const generateSalesTicket = async (saleId: string, res: ExpressResponse): Promise<void> => {
  const sale = await SaleModel.findById(saleId)
    .populate({ path: 'clientId', select: 'name rfc address' })
    .populate({ path: 'sellerUserId', select: 'name' })
    .lean();

  if (!sale) {
    throw new Error('Venta no encontrada');
  }

  const client: any = sale.clientId;
  const seller: any = sale.sellerUserId;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="nota-${sale.folio}.pdf"`);
  doc.pipe(res);

  // Encabezado
  doc.fontSize(20).text('Nota de Remisión', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Folio: ${sale.folio}`);
  doc.text(`Fecha: ${new Date(sale.saleDate).toLocaleDateString('es-MX')}`);
  doc.text(`Cliente: ${client?.name ?? '---'}`);
  doc.text(`RFC: ${client?.rfc ?? '---'}`);
  doc.text(`Dirección: ${client?.address ?? '---'}`);
  doc.moveDown();

  doc.text(`Vendedor: ${seller?.name ?? '---'}`);
  doc.text(`Tipo de pago: ${sale.paymentType}`);
  doc.text(`Método de pago: ${sale.paymentMethod}`);
  doc.text(`Referencia: ${sale.reference ?? '---'}`);
  if (sale.dueDate) doc.text(`Vence: ${new Date(sale.dueDate).toLocaleDateString('es-MX')}`);
  doc.moveDown();

  // Detalle de cajas
  doc.fontSize(14).text('Cajas:', { underline: true });
  sale.boxDetails.forEach((box, i) => {
    doc.fontSize(12).text(
      `${i + 1}. Tipo: ${box.type} | Peso: ${box.weightKg.toFixed(2)} kg | Precio/kg: $${box.unitPrice.toFixed(2)} | Subtotal: $${(box.weightKg * box.unitPrice).toFixed(2)}`
    );
  });

  doc.moveDown();

  // Totales
  doc.fontSize(14).text('Resumen:', { underline: true });
  doc.fontSize(12).text(`Total de cajas: ${sale.totalBoxes}`);
  doc.text(`Peso total: ${sale.totalKg.toFixed(2)} kg`);
  doc.text(`Precio promedio/kg: $${sale.pricePerKg.toFixed(2)}`);
  doc.text(`Subtotal: $${sale.subtotal.toFixed(2)}`);
  doc.text(`IVA (16%): $${sale.iva.toFixed(2)}`);
  doc.text(`Total con IVA: $${sale.totalWithIva.toFixed(2)}`);
  doc.text(`Abonado: $${sale.amountPaid.toFixed(2)}`);
  doc.text(`Pendiente: $${sale.amountPending.toFixed(2)}`);

  doc.end();
};

// 📊 Generar reporte de abonos por cliente (Excel o PDF)
export const generatePaymentsReport = async (
  filters: ReportFilters,
  format: 'excel' | 'pdf',
  res: ExpressResponse
): Promise<void> => {
  const sales = await SaleModel.find({
    'payments.date': { $gte: filters.from, $lte: filters.to }
  })
    .populate('clientId', 'name')
    .lean();

  const payments = sales.flatMap((sale) => {
    const client: any = sale.clientId;
    return (sale.payments || []).filter(p => {
      const date = new Date(p.date);
      return date >= filters.from && date <= filters.to;
    }).map(p => ({
      date: new Date(p.date).toLocaleDateString('es-MX'),
      clientName: client?.name || '---',
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? '---',
      folio: sale.folio,
      totalSale: sale.totalWithIva
    }));
  });

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Abonos');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Cliente', key: 'clientName', width: 25 },
      { header: 'Monto', key: 'amount', width: 15 },
      { header: 'Método', key: 'method', width: 15 },
      { header: 'Referencia', key: 'reference', width: 25 },
      { header: 'Folio Venta', key: 'folio', width: 20 },
      { header: 'Total Venta', key: 'totalSale', width: 20 }
    ];

    worksheet.addRows(payments);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-abonos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-abonos.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Reporte de Abonos', { align: 'center' });
    doc.moveDown();

    payments.forEach((p, i) => {
      doc.fontSize(12).text(`${i + 1}. ${p.date} | ${p.clientName} | $${p.amount.toFixed(2)} | ${p.method} | Ref: ${p.reference} | Folio: ${p.folio}`);
    });

    doc.end();
  }
};

// 🧮 Reporte de ventas por cliente por día (solo clasificación y cajas)
export const generateClientDailySalesReport = async (
  filters: ReportFilters,
  format: 'excel' | 'pdf',
  res: ExpressResponse
): Promise<void> => {
  const sales = await SaleModel.find({
    saleDate: { $gte: filters.from, $lte: filters.to }
  })
    .populate('clientId', 'name')
    .lean();

  const summary: Record<string, Record<string, number>> = {};

  for (const sale of sales) {
    const clientName = (sale.clientId as any)?.name ?? '---';
    if (!summary[clientName]) summary[clientName] = {};

    for (const box of sale.boxDetails) {
      summary[clientName][box.type] = (summary[clientName][box.type] || 0) + 1;
    }
  }

  const reportRows = Object.entries(summary).flatMap(([client, classifications]) => {
    return Object.entries(classifications).map(([classification, count]) => ({
      client,
      classification,
      boxes: count
    }));
  });

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ventas por Cliente');

    worksheet.columns = [
      { header: 'Cliente', key: 'client', width: 25 },
      { header: 'Clasificación', key: 'classification', width: 20 },
      { header: 'Cajas', key: 'boxes', width: 10 }
    ];

    worksheet.addRows(reportRows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas-por-cliente.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas-por-cliente.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Ventas por Cliente por Clasificación', { align: 'center' });
    doc.moveDown();

    reportRows.forEach((row, i) => {
      doc.fontSize(12).text(`${i + 1}. Cliente: ${row.client} | Tipo: ${row.classification} | Cajas: ${row.boxes}`);
    });

    doc.end();
  }
};

// 🧮 Reporte semanal por clasificación (cajas, peso, porcentaje)
export const generateWeeklySalesByClassification = async (
  filters: ReportFilters,
  format: 'excel' | 'pdf',
  res: ExpressResponse
): Promise<void> => {
  const sales = await SaleModel.find({
    saleDate: { $gte: filters.from, $lte: filters.to }
  }).lean();

  const summary: Record<string, { count: number; totalWeight: number }> = {};
  let globalWeight = 0;

  for (const sale of sales) {
    for (const box of sale.boxDetails) {
      if (!summary[box.type]) summary[box.type] = { count: 0, totalWeight: 0 };
      summary[box.type].count += 1;
      summary[box.type].totalWeight += box.weightKg;
      globalWeight += box.weightKg;
    }
  }

  const reportRows = Object.entries(summary).map(([type, data]) => ({
    classification: type,
    boxes: data.count,
    netWeight: Number(data.totalWeight.toFixed(2)),
    percent: Number(((data.totalWeight / globalWeight) * 100).toFixed(2))
  }));

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen Semanal');

    worksheet.columns = [
      { header: 'Clasificación', key: 'classification', width: 20 },
      { header: 'Cajas', key: 'boxes', width: 10 },
      { header: 'Peso Neto (Kg)', key: 'netWeight', width: 18 },
      { header: '% del total', key: 'percent', width: 15 }
    ];

    worksheet.addRows(reportRows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas-semanales-clasificacion.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas-semanales-clasificacion.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Ventas Semanales por Clasificación', { align: 'center' });
    doc.moveDown();

    reportRows.forEach((row, i) => {
      doc.fontSize(12).text(`${i + 1}. ${row.classification} | Cajas: ${row.boxes} | Peso Neto: ${row.netWeight} kg | ${row.percent}% del total`);
    });

    doc.end();
  }
};

// 💰 Reporte resumen financiero de ventas (por cliente)
export const generateFinancialSalesSummary = async (
  filters: ReportFilters,
  format: 'excel' | 'pdf',
  res: ExpressResponse
): Promise<void> => {
  const sales = await SaleModel.find({
    saleDate: { $gte: filters.from, $lte: filters.to }
  })
    .populate('clientId', 'name')
    .lean();

  const summary: Record<string, { total: number; paid: number; pending: number }> = {};

  for (const sale of sales) {
    const client: any = sale.clientId;
    const clientName = client?.name ?? '---';

    if (!summary[clientName]) {
      summary[clientName] = { total: 0, paid: 0, pending: 0 };
    }

    summary[clientName].total += sale.totalWithIva;
    summary[clientName].paid += sale.amountPaid;
    summary[clientName].pending += sale.amountPending;
  }

  const reportRows = Object.entries(summary).map(([client, data]) => ({
    client,
    total: Number(data.total.toFixed(2)),
    paid: Number(data.paid.toFixed(2)),
    pending: Number(data.pending.toFixed(2))
  }));

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen Financiero');

    worksheet.columns = [
      { header: 'Cliente', key: 'client', width: 25 },
      { header: 'Total Venta ($)', key: 'total', width: 20 },
      { header: 'Pagado ($)', key: 'paid', width: 20 },
      { header: 'Pendiente ($)', key: 'pending', width: 20 }
    ];

    worksheet.addRows(reportRows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="resumen-financiero-ventas.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resumen-financiero-ventas.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Resumen Financiero de Ventas', { align: 'center' });
    doc.moveDown();

    reportRows.forEach((row, i) => {
      doc.fontSize(12).text(`${i + 1}. Cliente: ${row.client} | Total: $${row.total} | Pagado: $${row.paid} | Pendiente: $${row.pending}`);
    });

    doc.end();
  }
};