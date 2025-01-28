import { QueryTypes } from 'sequelize'
/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'
import { SalesInventoryModel } from '@app/repositories/mongoose/models/sales-inventory.model'
/* dtos */
import { IBoxProduction, IBoxProductionSequelize } from '@app/dtos/box-production.dto'
import { ISalesInventory } from '@app/dtos/sales-inventory.dto'
import { Types } from '@app/repositories/mongoose'
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model'
import { extractDataFromBarcode } from '@app/utils/barcode.util'
import { AnyBulkWriteOperation, AnyKeys, AnyObject } from 'mongoose'
import { AppErrorResponse } from '@app/models/app.response'

class BoxProductionService {
  async getAll() {
    const boxes = await BoxProductionModel.find({ active: true })
    return boxes
  }

  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code })
    return box
  }

  async sendBoxesToSells(shed: string, codes: string[]) {
    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>("SELECT * FROM produccion_cajas WHERE status = 1 AND codigo IN (:codes)", {
      type: QueryTypes.SELECT,
      replacements: { codes }
    })

    const sequelizeToMongooseFields = boxes.map((box) => {
      return {
        updateOne: {
          filter: { code: box.codigo },
          update: {
            shed: new Types.ObjectId(shed),
            code: box.codigo,
            weight: parseFloat(box.peso),
            type: box.tipo,
          },
          upsert: true
        }
      }
    })

    const boxesInSales = SalesInventoryModel.insertMany(sequelizeToMongooseFields)
    return boxesInSales
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
        return {
          updateOne: {
            filter: { code: box.codigo },
            update: { $set: document },
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
    return boxesWithCodes
  }
}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
