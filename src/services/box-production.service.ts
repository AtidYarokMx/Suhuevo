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

class BoxProductionService {
  async getAll() {
    const boxes = await BoxProductionModel.find({ active: true, status: 1 })
    return boxes
  }

  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code })
    return box
  }

  async sendBoxesToSells({ codes, plates }: z.infer<typeof sendBoxesToSellsBody>, session: ClientSession, locals: AppLocals) {
    const ids = await BoxProductionModel.find({ active: true, status: 1, code: { $in: codes } }, { _id: true }, { session }).exec()

    if (ids.length <= 0)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", description: "No se encontró ningún código", code: "CodesNotFound", message: "No se encontraron códigos con los parámetros seleccionados" })

    const updated = await BoxProductionModel.updateMany({ active: true, status: 1, code: { $in: codes } }, { status: 2 }, { session, runValidators: true }).exec()
    const user = locals.user._id
    const codeItems = ids.map<IShipmentCode>((item, index) => ({ code: item._id }))
    const shipment = new ShipmentModel({ name: "Envío de Producción a Ventas", codes: codeItems, vehiclePlates: plates, createdBy: user, lastUpdateBy: user })
    await shipment.save({ session, validateBeforeSave: true })
    return updated
  }

  async synchronize() {
    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>("SELECT * FROM produccion_cajas WHERE status = 1", { type: QueryTypes.SELECT })
    if (boxes.length <= 0)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", description: "No se encontró ningún código", code: "CodesNotFound", message: "No se encontraron códigos con los parámetros seleccionados" })

    const codes = boxes.map((item) => item.codigo)

    const existingCodes = await BoxProductionModel.find({ code: { $in: codes }, active: true }, { code: true })
    const existingCodesArray = existingCodes.map((item) => item.code)

    const sequelizeToMongooseFields = boxes.map<AnyBulkWriteOperation<AnyKeys<IBoxProduction> & AnyObject>>((box) => {
      const { weight, type } = extractDataFromBarcode(box.codigo)

      const document: AnyKeys<IBoxProduction> & AnyObject = {
        id: box.id,
        farmNumber: box.id_granja,
        shedNumber: box.id_caceta,
        code: box.codigo,
        weight,
        type,
        status: box.status,
      }

      if (existingCodesArray.includes(box.codigo)) {
        const documentWihoutStatus = { ...document }
        delete documentWihoutStatus.status

        return {
          updateOne: {
            filter: { code: box.codigo },
            update: { $set: documentWihoutStatus },
          },
        }
      }

      return {
        insertOne: {
          document
        },
      }
    })

    const boxesWithCodes = await BoxProductionModel.bulkWrite(sequelizeToMongooseFields)
    customLog("boxesWithCodes", boxesWithCodes)
    return boxesWithCodes
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
