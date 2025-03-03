import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model';
import { WeeklyRecordModel } from '@app/repositories/mongoose/models/weeklyRecord.model';
import { getAdminWeekRange } from '@app/utils/date.util';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import path from 'path';

export const generateWeeklyProductionReport = async (shedId: string): Promise<string> => {
  return generateProductionReport(shedId, { currentWeekOnly: true }, 'weekly_production.xlsx');
};

export const generateHistoricalProductionReport = async (shedId: string): Promise<string> => {
  return generateProductionReport(shedId, {}, 'historical_production.xlsx');
};

async function generateProductionReport(shedId: string, filter: any, fileName: string): Promise<string> {
  try {
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
        foodConsumed: p.totalFoodConsumedKg ?? 0
      };
    });

    rows.forEach(row => worksheet.addRow(row));

    const filePath = path.join(__dirname, `../reports/${fileName}`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  } catch (error) {
    throw new Error('Error generating Excel file: ' + (error as Error).message);
  }
}