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

  async sendBoxesToSells({ codes }: z.infer<typeof sendBoxesToSellsBody>, session: ClientSession, locals: AppLocals) {
    const ids = await BoxProductionModel.find({ active: true, status: 1, code: { $in: codes } }, { _id: true }, { session }).exec()

    if (ids.length <= 0)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", description: "No se encontró ningún código", code: "CodesNotFound", message: "No se encontraron códigos con los parámetros seleccionados" })

    const updated = await BoxProductionModel.updateMany({ active: true, status: 1, code: { $in: codes } }, { status: 2 }, { session, runValidators: true }).exec()
    const user = locals.user._id
    const codeItems = ids.map<IShipmentCode>((item, index) => ({ code: item._id }))
    const shipment = new ShipmentModel({ name: "Envío de Producción a Ventas", codes: codeItems, createdBy: user, lastUpdateBy: user })
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
}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
