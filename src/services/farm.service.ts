/* lib */
import mongoose, { type ClientSession } from 'mongoose'
/* app models */
import { AppErrorResponse } from '@app/models/app.response'
/* models */
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
/* dtos */
import { createFarmBody, updateFarmBody } from '@app/dtos/farm.dto'
import { Types } from '@app/repositories/mongoose'
import { AppLocals } from '@app/interfaces/auth.dto'
import { customLog } from '@app/utils/util.util'
import { WeeklyRecordModel } from '@app/repositories/mongoose/models/weeklyRecord.model'
import { getCurrentWeekRange } from '@app/utils/week.util'
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model'


class FarmService {
  /**
   * Obtiene el siguiente `farmNumber` disponible
   */
  private async getNextFarmNumber(session: ClientSession): Promise<number> {
    customLog("📌 Buscando el último número de granja...");
    try {
      const lastFarm = await FarmModel.findOne({}, { farmNumber: 1 })
        .sort({ farmNumber: -1 })
        .session(session)
        .exec();

      const nextFarmNumber = lastFarm ? (lastFarm.farmNumber ?? 0) + 1 : 1;
      customLog(`✅ Siguiente farmNumber disponible: ${nextFarmNumber}`);
      return nextFarmNumber;
    } catch (error) {
      customLog("❌ Error en getNextFarmNumber:", error);
      throw new AppErrorResponse({
        name: "GetNextFarmNumberError",
        statusCode: 500,
        message: "Error al obtener el siguiente número de granja.",
      });
    }
  }


  async getOne(_id: string) {
    try {
      customLog(`📌 Iniciando búsqueda de granja con id: ${_id}`);

      // 🔹 Buscar la granja
      const farm = await FarmModel.findOne({ _id, active: true })
        .select('-sheds')
        .lean();

      if (!farm) {
        throw new AppErrorResponse({
          name: 'FarmNotFound',
          statusCode: 404,
          message: 'No se encontró la granja solicitada',
        });
      }

      customLog(`🟢 Granja encontrada: ${farm.name}`);

      // 🔹 Obtener el resumen de la semana actual desde WeeklyRecord
      const latestWeeklyRecord = await WeeklyRecordModel.findOne(
        { farmId: _id },
        {
          totalHensAlive: 1,
          totalFoodConsumedKg: 1,
          totalMortality: 1,
          avgHensWeight: 1,
          avgEggWeight: 1,
          weekStart: 1,
          weekEnd: 1,
        }
      )
        .sort({ weekStart: -1 })
        .lean();

      // 🔹 Obtener producción de cajas y huevos desde `BoxProductionModel`
      const { weekStart } = await getCurrentWeekRange();
      const boxProductionRecords = await BoxProductionModel.find({
        farm: _id,
        createdAt: { $gte: weekStart },
      })
        .select("totalEggs totalNetWeight")
        .lean();

      const totalProducedEggs = boxProductionRecords.reduce((sum, box) => sum + (Number(box.totalEggs) || 0), 0);
      const totalNetWeight = boxProductionRecords.reduce((sum, box) => sum + (box.netWeight || 0), 0);
      const totalProducedBoxes = boxProductionRecords.length;
      const avgEggWeight = totalProducedEggs > 0 ? totalNetWeight / totalProducedEggs : 0;

      // 🔹 Verificar si hay datos de resumen o usar valores predeterminados
      const summary = latestWeeklyRecord || {
        totalHensAlive: 0,
        totalFoodConsumedKg: 0,
        totalMortality: 0,
        avgHensWeight: 0,
        avgEggWeight: 0,
        totalProducedBoxes: 0,
        totalProducedEggs: 0,
        weekStart: null,
        weekEnd: null,
      };

      // 🔹 Actualizar producción de huevos y cajas en el resumen
      summary.totalProducedEggs = totalProducedEggs;
      summary.totalProducedBoxes = totalProducedBoxes;
      summary.avgEggWeight = avgEggWeight;

      customLog(`✅ Resumen de la granja ${farm.name}:`, summary);

      return { ...farm, summary };
    } catch (error: any) {
      customLog(`❌ Error al obtener la granja con id ${_id}: ${error.message}`);
      throw error;
    }
  }



  async getAll() {
    const farms = await FarmModel.aggregate([
      {
        $match: { active: true },
      },
      {
        $lookup: {
          from: 'sheds',
          localField: '_id',
          foreignField: 'farm',
          as: 'sheds',
        },
      },
      {
        $lookup: {
          from: 'weeklyRecords',
          let: { shedIds: '$sheds._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$shed', '$$shedIds'] } } },
            { $sort: { week: -1 } },
            {
              $group: {
                _id: '$shed',
                latestRecord: { $first: '$$ROOT' }
              }
            },
            { $replaceRoot: { newRoot: '$latestRecord' } }
          ],
          as: 'weeklyRecords',
        },
      },
      {
        $addFields: {
          summary: {
            weekStart: { $max: '$weeklyRecords.weekStart' },
            weekEnd: { $max: '$weeklyRecords.weekEnd' },
            totalHensAlive: { $sum: '$weeklyRecords.totalHensAlive' },
            totalFoodConsumedKg: { $sum: '$weeklyRecords.foodConsumed' },
            totalProducedBoxes: { $sum: '$weeklyRecords.producedBoxes' },
            totalProducedEggs: { $sum: '$weeklyRecords.producedEggs' },
            totalMortality: { $sum: '$weeklyRecords.mortality' },
            avgEggWeight: { $avg: '$weeklyRecords.avgEggWeight' },
            avgHensWeight: { $avg: '$weeklyRecords.avgHensWeight' },
          },
          chartsData: {
            $map: {
              input: '$weeklyRecords',
              as: 'record',
              in: {
                week: '$$record.weekStart',
                foodConsumedKG: '$$record.foodConsumed',
                hensAlive: '$$record.totalHensAlive',
                producedEggs: '$$record.producedEggs',
                producedBoxes: '$$record.producedBoxes',
              },
            },
          },
        },
      },
      {
        $project: {
          sheds: 0,
          weeklyRecords: 0,
        },
      },
    ]).exec();

    return farms;
  }


  async getOneWithSheds(_id: string) {
    try {
      customLog(`📌 Iniciando búsqueda de granja con id: ${_id} incluyendo casetas`);

      const farm = await FarmModel.findById(_id)
        .populate({
          path: "sheds",
          select: "name description status ageWeeks generationId initialHensCount",
        })
        .lean({ virtuals: true }) as { sheds: any[]; name: string } | null;

      if (!farm) {
        throw new AppErrorResponse({
          name: 'FarmNotFound',
          statusCode: 404,
          message: 'No se encontró la granja solicitada',
        });
      }

      customLog(`🟢 Granja encontrada: ${farm.name} con ${farm.sheds.length} casetas`);

      let summary = {
        totalHensAlive: 0,
        totalFoodConsumedKg: 0,
        totalMortality: 0,
        avgHensWeight: 0,
        avgEggWeight: 0,
        totalProducedBoxes: 0,
        totalProducedEggs: 0,
        weekStart: null,
        weekEnd: null,
      };

      let totalHensWeight = 0;
      let totalEggWeight = 0;
      let validHensWeightCount = 0;
      let validEggWeightCount = 0;

      for (const shed of farm.sheds) {
        customLog(`   🏠 Caseta: ${shed.name}`);

        // 🔹 Obtener el último WeeklyRecord
        const latestWeeklyRecord = await WeeklyRecordModel.findOne(
          { shedId: shed._id, generationId: shed.generationId },
          {
            totalHensAlive: 1,
            totalFoodConsumedKg: 1,
            totalMortality: 1,
            avgHensWeight: 1,
            avgEggWeight: 1,
            weekStart: 1,
            weekEnd: 1,
          }
        )
          .sort({ weekStart: -1 })
          .lean();

        // 🔹 Obtener Producción de Cajas y Huevos
        const { weekStart } = await getCurrentWeekRange();
        const boxProductions = await BoxProductionModel.find({
          shed: shed._id,
          createdAt: { $gte: weekStart },
        })
          .select("totalEggs totalNetWeight")
          .lean();

        const totalProducedEggs = boxProductions.reduce((sum, box) => sum + (Number(box.totalEggs) || 0), 0);
        const totalNetWeight = boxProductions.reduce((sum, box) => sum + (box.netWeight || 0), 0);
        const totalProducedBoxes = boxProductions.length;
        const avgEggWeight = totalProducedEggs > 0 ? totalNetWeight / totalProducedEggs : 0;

        // 🔹 Actualizar datos en la caseta
        shed.effectiveWeekStart = latestWeeklyRecord?.weekStart || null;
        shed.effectiveWeekEnd = latestWeeklyRecord?.weekEnd || null;
        shed.hasWeeklyData = !!latestWeeklyRecord;
        shed.totalHensAlive = latestWeeklyRecord?.totalHensAlive || 0;
        shed.totalFoodConsumedKg = latestWeeklyRecord?.totalFoodConsumedKg || 0;
        shed.totalMortality = latestWeeklyRecord?.totalMortality || 0;
        shed.totalProducedBoxes = totalProducedBoxes;
        shed.totalProducedEggs = totalProducedEggs;
        shed.avgEggWeight = avgEggWeight;
        shed.avgHensWeight = latestWeeklyRecord?.avgHensWeight || 0;

        // 🔹 Sumar datos al resumen de la granja
        summary.totalHensAlive += shed.totalHensAlive;
        summary.totalFoodConsumedKg += shed.totalFoodConsumedKg;
        summary.totalMortality += shed.totalMortality;
        summary.totalProducedBoxes += shed.totalProducedBoxes;
        summary.totalProducedEggs += shed.totalProducedEggs;

        // 🔹 Acumular datos para calcular promedios solo si hay datos válidos
        if (shed.avgHensWeight > 0) {
          totalHensWeight += shed.avgHensWeight;
          validHensWeightCount++;
        }

        if (avgEggWeight > 0) {
          totalEggWeight += avgEggWeight;
          validEggWeightCount++;
        }

        // 🔹 Actualizar la semana efectiva de la granja
        if (shed.effectiveWeekStart && (!summary.weekStart || shed.effectiveWeekStart > summary.weekStart)) {
          summary.weekStart = shed.effectiveWeekStart;
          summary.weekEnd = shed.effectiveWeekEnd;
        }

        customLog(`      - Total cajas producidas: ${shed.totalProducedBoxes}`);
        customLog(`      - Total huevos producidos: ${shed.totalProducedEggs}`);
        customLog(`      - Peso promedio del huevo: ${shed.avgEggWeight}`);
      }

      // 🔹 Ajustar los promedios evitando división por 0
      summary.avgHensWeight = validHensWeightCount > 0 ? totalHensWeight / validHensWeightCount : 0;
      summary.avgEggWeight = validEggWeightCount > 0 ? totalEggWeight / validEggWeightCount : 0;

      customLog(`✅ Resumen de la granja ${farm.name}:`, summary);

      return { ...farm, summary };
    } catch (error: any) {
      customLog(`❌ Error al obtener la granja con id ${_id}: ${error.message}`);
      throw error;
    }
  }



  async getAllWithSheds() {
    const { weekStart, weekEnd } = await getCurrentWeekRange();
    customLog(`🟢 Semana administrativa: ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);

    // 🔹 Obtener todas las granjas con sus casetas
    const farms = (await FarmModel.find({ active: true })
      .populate({
        path: "sheds",
        select: "name description status initialHensCount ageWeeks generationId",
      })
      .lean()) as any[];

    customLog(`✅ Total granjas encontradas: ${farms.length}`);

    for (const farm of farms) {
      // 🟢 Inicializar resumen de la granja
      farm.sheds = farm.sheds || [];
      farm.summary = {
        effectiveWeekStart: null,
        effectiveWeekEnd: null,
        hasWeeklyData: false,
        totalHensAlive: 0,
        totalFoodConsumedKg: 0,
        totalMortality: 0,
        avgHensWeight: 0,
        totalProducedBoxes: 0,
        totalProducedEggs: 0,
        avgEggWeight: 0,
      };

      customLog(`📌 Granja: ${farm.name}`);

      let totalHensWeight = 0;
      let totalEggWeight = 0;
      let hensWeightCount = 0;
      let eggsWeightCount = 0;

      for (const shed of farm.sheds) {
        customLog(`   🏠 Caseta: ${shed.name}`);

        // 🔹 Obtener el último WeeklyRecord
        const latestWeeklyRecord = await WeeklyRecordModel.findOne(
          { shedId: shed._id, generationId: shed.generationId },
          {
            totalHensAlive: 1,
            totalFoodConsumedKg: 1,
            totalProducedEggs: 1,
            totalProducedBoxes: 1,
            totalMortality: 1,
            avgHensWeight: 1,
            avgEggWeight: 1,
            weekStart: 1,
            weekEnd: 1,
          }
        )
          .sort({ weekStart: -1 })
          .lean();

        // 🔹 Obtener Producción de Cajas y Huevos
        const boxProductions = await BoxProductionModel.find({
          shed: shed._id,
          createdAt: { $gte: weekStart, $lte: weekEnd },
        })
          .select("totalEggs netWeight")
          .lean();

        // 🔹 Sumar producción de cajas y huevos
        const totalProducedEggs = boxProductions.reduce((sum, box) => sum + (Number(box.totalEggs) || 0), 0);
        const totalNetWeight = boxProductions.reduce((sum, box) => sum + (box.netWeight || 0), 0);
        const totalProducedBoxes = boxProductions.length;

        // 🔹 Calcular promedio de peso del huevo (evitando división por `0`)
        const avgEggWeight = totalProducedEggs > 0 ? totalNetWeight / totalProducedEggs : 0;

        // 🔹 Asignar datos a la caseta
        shed.effectiveWeekStart = latestWeeklyRecord?.weekStart || null;
        shed.effectiveWeekEnd = latestWeeklyRecord?.weekEnd || null;
        shed.hasWeeklyData = !!latestWeeklyRecord;
        shed.totalHensAlive = latestWeeklyRecord?.totalHensAlive || 0;
        shed.totalFoodConsumedKg = latestWeeklyRecord?.totalFoodConsumedKg || 0;
        shed.totalMortality = latestWeeklyRecord?.totalMortality || 0;
        shed.totalProducedBoxes = totalProducedBoxes;
        shed.totalProducedEggs = totalProducedEggs;
        shed.avgEggWeight = avgEggWeight;
        shed.avgHensWeight = latestWeeklyRecord?.avgHensWeight || 0; // 🔹 Corrección: Usar directamente el valor del registro semanal

        // 🔹 Solo sumar datos de casetas activas al resumen de la granja

        farm.summary.totalHensAlive += shed.totalHensAlive;
        farm.summary.totalFoodConsumedKg += shed.totalFoodConsumedKg;
        farm.summary.totalMortality += shed.totalMortality;
        farm.summary.totalProducedBoxes += shed.totalProducedBoxes;
        farm.summary.totalProducedEggs += shed.totalProducedEggs;

        if (shed.totalHensAlive > 0) {
          totalHensWeight += shed.avgHensWeight;
          hensWeightCount++;
        }

        if (shed.totalProducedEggs > 0) {
          totalEggWeight += avgEggWeight;
          eggsWeightCount++;
        }


        // 🔹 Actualizar la semana efectiva de la granja si es necesario
        if (
          shed.effectiveWeekStart &&
          (!farm.summary.effectiveWeekStart || shed.effectiveWeekStart > farm.summary.effectiveWeekStart)
        ) {
          farm.summary.effectiveWeekStart = shed.effectiveWeekStart;
          farm.summary.effectiveWeekEnd = shed.effectiveWeekEnd;
        }

        if (shed.hasWeeklyData) {
          farm.summary.hasWeeklyData = true;
        }

        customLog(`      - Semana efectiva: ${shed.effectiveWeekStart} - ${shed.effectiveWeekEnd}`);
        customLog(`      - ¿Tiene datos semanales?: ${shed.hasWeeklyData}`);
        customLog(`      - Gallinas vivas: ${shed.totalHensAlive}`);
        customLog(`      - Mortalidad: ${shed.totalMortality}`);
        customLog(`      - Total cajas producidas: ${shed.totalProducedBoxes}`);
        customLog(`      - Total huevos producidos: ${shed.totalProducedEggs}`);
        customLog(`      - Peso promedio del huevo: ${shed.avgEggWeight}`);
      }

      // 🔹 Calcular promedios en `summary` evitando división por 0
      farm.summary.avgHensWeight = hensWeightCount > 0 ? totalHensWeight / hensWeightCount : 0;
      farm.summary.avgEggWeight = eggsWeightCount > 0 ? totalEggWeight / eggsWeightCount : 0;

      customLog(`✅ Resumen de la granja ${farm.name}:`, farm.summary);
    }

    return farms;
  }



  /**
   * Crea una nueva granja con `farmNumber` único
   */
  async create(body: createFarmBody, session: ClientSession, locals: AppLocals) {
    try {
      const user = locals.user._id;

      const farmNumber = body.farmNumber || (await this.getNextFarmNumber(session));
      const exists = await FarmModel.findOne({ farmNumber }).session(session).exec();

      if (exists) {
        throw new AppErrorResponse({
          name: "FarmNumberInUseError",
          statusCode: 400,
          message: `El número de granja ${farmNumber} ya está en uso.`,
        });
      }

      customLog("📌 [Service] Creando nueva granja...");
      const farm = new FarmModel({
        ...body,
        farmNumber,
        createdBy: user,
        lastUpdateBy: user,
      });

      const saved = await farm.save({ validateBeforeSave: true, session });

      customLog("✅ [Service] Granja creada exitosamente:", saved);
      return saved.toJSON();
    } catch (error) {
      throw error;
    }
  }

  async update(_id: string, body: updateFarmBody, session: ClientSession, locals: AppLocals) {
    const farm = await FarmModel.findOne({ _id, active: true }, null, { session }).exec()
    if (farm == null) throw new AppErrorResponse({ statusCode: 404, name: "Granja no encontrada", description: "La granja ingresada es inexistente en el sistema o fue eliminada" })
    const user = locals.user._id
    farm.set({ ...body, lastUpdateBy: user })
    const updated = await farm.save({ validateBeforeSave: true, session })
    return updated
  }
}

const farmService: FarmService = new FarmService()
export default farmService
