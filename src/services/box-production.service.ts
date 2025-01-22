import { QueryTypes } from 'sequelize'
/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'
import { SalesInventoryModel } from '@app/repositories/mongoose/models/sales-inventory.model'
/* dtos */
import { IBoxProductionSequelize } from '@app/dtos/box-production.dto'
import { ISalesInventory } from '@app/dtos/sales-inventory.dto'
import { Types } from '@app/repositories/mongoose'

class BoxProductionService {
  async getAll() {
    const boxes = await AppSequelizeMSSQLClient.query("SELECT * FROM produccion_cajas WHERE status = 1")
    return boxes
  }

  async getOne(code: string) {
    const boxes = await AppSequelizeMSSQLClient.query("SELECT TOP 1 * FROM produccion_cajas WHERE status = 1 AND codigo = :code", {
      replacements: { code },
      type: QueryTypes.SELECT
    })
    return boxes
  }

  async sendBoxesToSells(shed: string, codes: string[]) {
    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>("SELECT * FROM produccion_cajas WHERE status = 1 AND codigo IN (:codes)", { type: QueryTypes.SELECT, replacements: { codes } })

    const sequelizeToMongooseFields = boxes.map<Omit<ISalesInventory, "active" | "createdAt" | "updatedAt">>((box) => {
      return {
        type: box.tipo,
        weight: parseFloat(box.peso),
        code: box.codigo,
        shed: new Types.ObjectId(shed),
      }
    })

    const boxesInSales = SalesInventoryModel.insertMany(sequelizeToMongooseFields)
    return boxesInSales
  }
}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
