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
export const generateProductionReport = async (shedId: string, filter: { currentWeekOnly?: boolean }, res: ExpressResponse, fileName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production');

  worksheet.columns = [
    { header: 'Shed', key: 'shed', width: 20 },
    { header: 'Week Start', key: 'weekStart', width: 15 },
    { header: 'Week End', key: 'weekEnd', width: 15 },
    { header: 'Eggs Produced', key: 'eggsProduced', width: 20 },
    { header: 'Boxes Produced', key: 'boxesProduced', width: 20 },
    { header: 'Dead Hens', key: 'deadHens', width: 20 },
    { header: 'Water Consumed (L)', key: 'waterConsumed', width: 20 },
    { header: 'Food Consumed (Kg)', key: 'foodConsumed', width: 20 }
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
      waterConsumed: p.totalWaterConsumedLiters ?? 0,
      foodConsumed: p.totalFoodConsumedKg ?? 0
    };
  });

  rows.forEach(row => worksheet.addRow(row));

  // ✅ Enviar el archivo directo al navegador
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
};

// 🚀 Generar reporte semanal (desde controller lo llamas)
export const generateWeeklyProductionReport = async (shedId: string, res: ExpressResponse) => {
  return generateProductionReport(shedId, { currentWeekOnly: true }, res, 'weekly_production.xlsx');
};

// 🚀 Generar reporte histórico
export const generateHistoricalProductionReport = async (shedId: string, res: ExpressResponse) => {
  return generateProductionReport(shedId, {}, res, 'historical_production.xlsx');
};

// 🚀 Generar reporte de ventas diarias
export const generateDailySalesReport = async (filters: ReportFilters, format: 'excel' | 'pdf', res: ExpressResponse) => {
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
