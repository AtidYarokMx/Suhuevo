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
    const farm = await FarmModel.findOne({ _id, active: true })
      .select('-sheds')
      .exec();
    if (!farm) {
      throw new AppErrorResponse({
        name: 'Farm Not Found',
        statusCode: 404,
        code: 'FarmNotFound',
        description: 'No se encontró la granja solicitada',
        message: 'No se encontró la granja solicitada',
      });
    }

    const weeklyRecords = await WeeklyRecordModel.aggregate([
      {
        $match: { farm: farm._id, active: true },
      },
      {
        $sort: { week: -1 },
      },
      {
        $group: {
          _id: null,
          weekStart: { $first: '$weekStart' },
          weekEnd: { $first: '$weekEnd' },
          totalHensAlive: { $sum: '$totalHensAlive' },
          totalFoodConsumedKg: { $sum: '$foodConsumed' },
          totalProducedBoxes: { $sum: '$producedBoxes' },
          totalProducedEggs: { $sum: '$producedEggs' },
          totalMortality: { $sum: '$mortality' },
          avgEggWeight: { $avg: '$avgEggWeight' },
          avgHensWeight: { $avg: '$avgHensWeight' },
        },
      },
    ]).exec();

    const summary = weeklyRecords.length > 0 ? weeklyRecords[0] : {
      weekStart: null,
      weekEnd: null,
      totalHensAlive: 0,
      totalFoodConsumedKg: 0,
      totalProducedBoxes: 0,
      totalProducedEggs: 0,
      totalMortality: 0,
      avgEggWeight: null,
      avgHensWeight: null,
    };

    return { ...farm.toObject(), summary };
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
    const farms = await FarmModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(_id), active: true },
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
          sheds: {
            $map: {
              input: '$sheds',
              as: 'shed',
              in: {
                $mergeObjects: [
                  '$$shed',
                  {
                    week: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.week', 0] }, null] },
                    period: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.period', 0] }, null] },
                    foodConsumed: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.foodConsumed', 0] }, 0] },
                    waterConsumed: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.waterConsumed', 0] }, 0] },
                    mortality: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.mortality', 0] }, 0] },
                    eggProduction: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.producedEggs', 0] }, 0] },
                    avgEggWeight: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.avgEggWeight', 0] }, null] },
                    avgHensWeight: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.avgHensWeight', 0] }, null] }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          weeklyRecords: 0,
        },
      },
    ]).exec();

    if (farms.length <= 0)
      throw new AppErrorResponse({ name: 'Farm Not Found', statusCode: 404, code: 'FarmNotFound', description: 'No se encontró la granja solicitada', message: 'No se encontró la granja solicitada' });

    return farms[0];
  }

  async getAllWithSheds() {
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
          sheds: {
            $map: {
              input: '$sheds',
              as: 'shed',
              in: {
                $mergeObjects: [
                  '$$shed',
                  {
                    week: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.week', 0] }, null] },
                    period: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.period', 0] }, null] },
                    foodConsumed: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.foodConsumed', 0] }, 0] },
                    waterConsumed: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.waterConsumed', 0] }, 0] },
                    mortality: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.mortality', 0] }, 0] },
                    eggProduction: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.producedEggs', 0] }, 0] },
                    avgEggWeight: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.avgEggWeight', 0] }, null] },
                    avgHensWeight: { $ifNull: [{ $arrayElemAt: ['$weeklyRecords.avgHensWeight', 0] }, null] }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          weeklyRecords: 0,
        },
      },
    ]).exec();

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
