import { QueryTypes } from 'sequelize'
/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'

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
}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
