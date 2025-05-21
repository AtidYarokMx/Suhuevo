/* lib */
import * as ExcelJS from "exceljs";
/* models */
import { ShedModel } from "@app/repositories/mongoose/models/shed.model";
import { SaleModel } from "@app/repositories/mongoose/schemas/sale.schema";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
/* utils */
import { getTodayMoment } from "@app/utils/date.util";
/* types */
import { IShed } from "@app/dtos/shed.dto";

class SummaryService {
  /**
   * Obtiene uno o varios puestos de trabajo según los parámetros de consulta.
   * - Si se envía `ids`, devuelve solo los trabajos con esos IDs.
   * - Si no se envía `ids`, devuelve todos los trabajos activos.
   *
   * @param query - Parámetros de consulta (`ids` opcional).
   * @returns Un objeto con los registros encontrados o una lista de trabajos.
   */
  async get() {
    // semana activa
    const today = getTodayMoment();
    const startOfWeek = today.clone().isoWeekday(3);
    // Si hoy es antes del miércoles, retrocedemos una semana
    if (today.isoWeekday() < 3) {
      startOfWeek.subtract(7, "days");
    }
    // Día final: martes siguiente
    const endOfWeek = startOfWeek.clone().add(6, "days");
    // Convertir a strings tipo 'YYYY-MM-DD' para comparar directamente
    const startDateStr = startOfWeek.format("YYYY-MM-DD");
    const endDateStr = endOfWeek.format("YYYY-MM-DD");
    // aggregate que trae la información básica del shed junto con la información más reciente de la semana en weeklyrecords
    const sheds = await ShedModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: "weeklyrecords",
          localField: "_id",
          foreignField: "shedId",
          as: "weeklyrecords",
          pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
        },
      },
      { $unwind: "$weeklyrecords" },
      {
        $lookup: {
          from: "farms",
          localField: "farm",
          foreignField: "_id",
          as: "farm",
        },
      },
      { $unwind: "$farm" },
      {
        $project: {
          farm: "$farm.name",
          weeklyrecords: 1,
          ageWeeks: 1,
          name: 1,
        },
      },
    ]).exec();

    // se hace un map para mandar la info de acuerdo a lo que se requiere en el front
    const productionAndFarming = sheds.map((item) => {
      const eggsPerDay = item.weeklyrecords.totalProducedEggs / 7;
      const posture = eggsPerDay / item.weeklyrecords.totalHensAlive;
      const currentPosture = posture * 100;

      return {
        farm: item.farm,
        name: item.name,
        age: item.ageWeeks,
        currentChicken: item.weeklyrecords.totalHensAlive,
        currentWeeklyProduction: item.weeklyrecords.totalProducedEggs,
        currentEggWeight: item.weeklyrecords.avgEggWeight,
        currentChickenWeight: item.weeklyrecords.avgHensWeight,
        currentFoodConsumption: item.weeklyrecords.totalFoodConsumedKg,
        currentMortalityRate: item.weeklyrecords.totalMortality,
        currentConversion: 0,
        currentPosture,
      };
    });

    const minProductionWeekAge = 16;

    const { farming, production } = productionAndFarming.reduce<{
      farming: typeof productionAndFarming;
      production: typeof productionAndFarming;
    }>(
      (prev, curr) => {
        if (curr.age < minProductionWeekAge) {
          prev.farming.push(curr);
        } else {
          prev.production.push(curr);
        }
        return prev;
      },
      { production: [], farming: [] }
    );

    const sales = await SaleModel.aggregate([
      { $unwind: "$boxDetails" },
      {
        $group: {
          _id: null,
          currentNetSales: { $sum: "$subtotal" },
          currentQualityOne: {
            $sum: {
              $cond: [
                { $eq: ["$boxDetails.type", "calidad1"] },
                { $multiply: ["$boxDetails.unitPrice", "$boxDetails.weightKg"] },
                0,
              ],
            },
          },
          currentQualityTwo: {
            $sum: {
              $cond: [
                { $eq: ["$boxDetails.type", "calidad2"] },
                { $multiply: ["$boxDetails.unitPrice", "$boxDetails.weightKg"] },
                0,
              ],
            },
          },
          currentQualityThree: {
            $sum: {
              $cond: [
                { $eq: ["$boxDetails.type", "calidad3"] },
                { $multiply: ["$boxDetails.unitPrice", "$boxDetails.weightKg"] },
                0,
              ],
            },
          },
          currentQualityLiquid: {
            $sum: {
              $cond: [
                { $eq: ["$boxDetails.type", "liquido"] },
                { $multiply: ["$boxDetails.unitPrice", "$boxDetails.weightKg"] },
                0,
              ],
            },
          },
          currentWaste: {
            $sum: {
              $cond: [
                { $eq: ["$boxDetails.type", "desecho"] },
                { $multiply: ["$boxDetails.unitPrice", "$boxDetails.weightKg"] },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          currentNetSales: 1,
          currentQualityOne: 1,
          currentQualityTwo: 1,
          currentQualityThree: 1,
          currentQualityLiquid: 1,
          currentWaste: 1,
        },
      },
    ]).exec();

    const absences = await AbsenceModel.aggregate([
      {
        $match: {
          date: {
            $gte: startDateStr,
            $lte: endDateStr,
          },
        },
      },
      {
        $count: "count",
      },
    ]);

    const attendances = await AttendanceModel.aggregate([
      {
        $match: {
          date: {
            $gte: startDateStr,
            $lte: endDateStr,
          },
        },
      },
      {
        $count: "count",
      },
    ]);

    // counts
    const absencesCount = absences.length > 0 ? absences[0].count : 0;
    const attendancesCount = attendances.length > 0 ? attendances[0].count : 0;

    // cosas de rh xd
    const humanResources = { currentAbsenteeism: absencesCount, currentAttendances: attendancesCount };

    return {
      production,
      farming,
      sales: sales?.[0] ?? {},
      humanResources,
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }

  async generateExcel(workbook: ExcelJS.Workbook) {
    const { startDate, endDate, ...data } = await this.get();
    const worksheet = workbook.addWorksheet("BSC");

    worksheet.getColumn("A").width = 25;
    worksheet.getColumn("B").width = 15;

    let rowIndex = 1;
    /* Encabezados principales */
    Object.entries(data).forEach(([key, value]) => {
      const headerRow = worksheet.addRow([key]);
      worksheet.mergeCells(rowIndex, 1, rowIndex, 2);

      headerRow.eachCell((cell) => {
        cell.style = {
          font: {
            size: 12,
            bold: true,
          },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "ff83cceb",
            },
          },
        };
      });

      rowIndex++;

      if (Array.isArray(value) && value.length > 0) {
        value.forEach((item) => {
          if (typeof item === "object" && item != null) {
            Object.keys(item).forEach((val) => {
              worksheet.addRow([val, item[val]]);
              rowIndex++;
            });
          }
        });
      }
      if (typeof value === "object" && !Array.isArray(value) && value != null) {
        Object.keys(value).forEach((val) => {
          worksheet.addRow([val, value[val]]);
          rowIndex++;
        });
      }
    });
  }
}

export default new SummaryService();
