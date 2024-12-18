/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { InventoryModel } from '@app/repositories/mongoose/models/inventory.model'
/* dtos */
import { updateInventoryBody, type createInventoryBody } from '@app/dtos/inventory.dto'


class InventoryService {
  async getOne(_id: string) {
    const inventory = await InventoryModel.findOne({ _id, active: true }).populate("shed").exec()
    return inventory
  }

  async getAll() {
    const inventory = await InventoryModel.find({ active: true }).populate("shed").exec()
    return inventory
  }

  async create(body: createInventoryBody) {
    const inventory = await InventoryModel.create({ ...body })
    return inventory
  }

  async update(id: string, body: updateInventoryBody, session: ClientSession) {
    const inventory = await InventoryModel.updateOne({ _id: id }, { ...body }, { session }).exec()
    return inventory
  }
}

const inventoryService: InventoryService = new InventoryService()
export default inventoryService
