/* models */
import { FarmModel } from "@app/repositories/mongoose/models/farm.model";
import { ShedModel } from "@app/repositories/mongoose/models/shed.model";
import { WeeklyRecordModel } from "@app/repositories/mongoose/models/weeklyRecord.model";
import { SaleModel } from "@app/repositories/mongoose/schemas/sale.schema";
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
    const production = sheds.map((item) => {
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

    // TODO: BSC para ventas
    const sales = await SaleModel.find({});
    // TODO: BSC para RH
    // code here...
    // TODO: BSC para Finances (????)
    // code here...
    // TODO: BSC para Purchases
    // code here...

    return {
      production,
      farming: [...production],
    };
  }
}

export default new SummaryService();
