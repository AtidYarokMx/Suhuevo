/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
import { InventoryModel } from '@app/repositories/mongoose/models/inventory.model'
/* dtos */
import { createShedBody, updateShedBody } from '@app/dtos/shed.dto'
import { AppErrorResponse } from '@app/models/app.response'


class ShedService {
  async getOne(_id: string) {
    const sheds = await ShedModel.findOne({ _id, active: true }).populate("farm").exec()
    return sheds
  }

  async getAll() {
    const sheds = await ShedModel.find({ active: true }).populate("farm").exec()
    return sheds
  }

  async create({ initialChicken, ...shedBody }: createShedBody, session: ClientSession) {
    const shed = new ShedModel({ ...shedBody })
    const inventory = new InventoryModel({ initialChicken, shed: shed._id })
    const saved = await shed.save({ validateBeforeSave: true, session })
    await inventory.save({ validateBeforeSave: true, session })
    return saved.toJSON()
  }

  async update(_id: string, body: updateShedBody, session: ClientSession) {
    const shed = await ShedModel.findOne({ _id, active: true }, null, { session }).exec()
    if (shed == null) throw new AppErrorResponse({ statusCode: 404, name: "Caseta no encontrada", description: "La caseta ingresada es inexistente en el sistema o fue eliminada" })
    const updated = await ShedModel.updateOne({ _id }, { ...body }, { session, runValidators: true }).exec()
    return updated
  }
}

const shedService: ShedService = new ShedService()
export default shedService
