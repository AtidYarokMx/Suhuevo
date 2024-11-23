/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
/* dtos */
// import { createShedBody, updateShedBody } from '@app/dtos/inve'


class InventoryService {
  async getOne(_id: string) {
    const sheds = await ShedModel.findOne({ _id, active: true }).populate("farm").exec()
    return sheds
  }

  async getAll() {
    const sheds = await ShedModel.find({ active: true }).populate("farm").exec()
    return sheds
  }
}

const inventoryService: InventoryService = new InventoryService()
export default inventoryService
