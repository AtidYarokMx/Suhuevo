/* lib */
import { QueryTypes } from 'sequelize'
import { AnyBulkWriteOperation, AnyKeys, AnyObject, ClientSession } from 'mongoose'
/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'
/* models */
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model'
/* utils */
import { extractDataFromBarcode } from '@app/utils/barcode.util'
/* dtos */
import { IBoxProduction, IBoxProductionSequelize, sendBoxesToSellsBody } from '@app/dtos/box-production.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { ShipmentModel } from '@app/repositories/mongoose/models/shipment.model'
import { z } from 'zod'
import { IShipmentCode } from '@app/dtos/shipment.dto'
import { customLog } from '@app/utils/util.util'
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'

class BoxProductionService {
  async getAll() {
    const boxes = await BoxProductionModel.find({ active: true, status: 1 })
    return boxes
  }

  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code })
    return box
  }

  async sendBoxesToSells({ codes, plates, driver }: z.infer<typeof sendBoxesToSellsBody>, session: ClientSession, locals: AppLocals) {
    const ids = await BoxProductionModel.find({ active: true, status: 1, code: { $in: codes } }, { _id: true }, { session }).exec()

    if (ids.length <= 0)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", description: "No se encontró ningún código", code: "CodesNotFound", message: "No se encontraron códigos con los parámetros seleccionados" })

    const updated = await BoxProductionModel.updateMany({ active: true, status: 1, code: { $in: codes } }, { status: 2 }, { session, runValidators: true }).exec()
    const user = locals.user._id
    const codeItems = ids.map<IShipmentCode>((item, index) => ({ code: item._id }))
    const shipment = new ShipmentModel({ name: "Envío de Producción a Ventas", codes: codeItems, vehiclePlates: plates, driver, createdBy: user, lastUpdateBy: user })
    await shipment.save({ session, validateBeforeSave: true })
    return updated
  }

  async synchronize() {
    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>(
      "SELECT * FROM produccion_cajas WHERE status = 1",
      { type: QueryTypes.SELECT }
    );

    if (boxes.length <= 0) {
      throw new AppErrorResponse({
        statusCode: 404,
        name: "Codes Not Found",
        message: "No se encontraron códigos en la base de datos."
      });
    }

    const codes = boxes.map((item) => item.codigo);

    // Obtener las granjas y casetas existentes con sus números
    const farms = await FarmModel.find({}, { _id: 1, farmNumber: 1 }).exec();
    const sheds = await ShedModel.find({}, { _id: 1, farm: 1, shedNumber: 1 }).exec();

    const farmMap = Object.fromEntries(farms.map((farm) => [farm.farmNumber, farm._id]));
    const shedMap = Object.fromEntries(sheds.map((shed) => [`${shed.farm}-${shed.shedNumber}`, shed._id]));

    const sequelizeToMongooseFields = boxes.map<AnyBulkWriteOperation<IBoxProduction>>((box) => {
      const farmId = farmMap[box.id_granja];
      const shedId = shedMap[`${farmId}-${box.id_caceta}`];

      if (!farmId || !shedId) {
        throw new AppErrorResponse({
          statusCode: 400,
          name: "Farm/Shed Not Found",
          message: `No se encontró una granja/caseta correspondiente para el código ${box.codigo}.`
        });
      }

      return {
        updateOne: {
          filter: { code: box.codigo },
          update: { $set: { farm: farmId, shed: shedId } },
          upsert: true
        }
      };
    });

    const result = await BoxProductionModel.bulkWrite(sequelizeToMongooseFields);
    return result;
  }

  async getEggTypeSummaryFromBoxes(filters: { startDate?: string; endDate?: string; farmNumber?: number; shedNumber?: number; status?: number }) {
    console.log("Query Params:", filters);
    const matchConditions: any = { active: true };

    // Filtros opcionales
    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) matchConditions.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchConditions.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.farmNumber) matchConditions.farmNumber = filters.farmNumber;
    if (filters.shedNumber) matchConditions.shedNumber = filters.shedNumber;
    if (filters.status) matchConditions.status = filters.status;

    const summary = await BoxProductionModel.aggregate([
      { $match: matchConditions }, // Aplicar los filtros dinámicos
      {
        $group: {
          _id: "$type", // Agrupar por tipo de huevo
          quantity: { $sum: 1 }, // Contar la cantidad de cada tipo de caja
        },
      },
      {
        $lookup: {
          from: "catalog-eggs", // Nombre de la colección del catálogo de huevos
          localField: "_id", // Relacionar con el tipo de huevo
          foreignField: "id", // ID en el catálogo
          as: "eggInfo", // Relación con el catálogo
        },
      },
      {
        $unwind: {
          path: "$eggInfo",
          preserveNullAndEmptyArrays: true, // Permitir mostrar tipos sin relación
        },
      },
      {
        $project: {
          eggType: "$_id",
          quantity: 1,
          name: "$eggInfo.name",
          description: "$eggInfo.description",
        },
      },
    ]).exec();

    return summary;
  }


}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
