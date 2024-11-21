/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'

class BoxProductionService {
  async getAll() {
    const boxes = await AppSequelizeMSSQLClient.query("SELECT * FROM produccion_cajas WHERE status = 1")
    return boxes
  }
}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
