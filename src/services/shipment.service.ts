/* models */
import { ShipmentModel } from '@app/repositories/mongoose/models/shipment.model'


class ShipmentService {
  async getOne(_id: string) {
    const shipment = await ShipmentModel.findOne({ _id, active: true }).populate([{ path: "codes.code", match: { active: true } }, { path: "createdBy" }]).exec()
    return shipment
  }

  async getAll() {
    const shipments = await ShipmentModel.find({ active: true }).populate([{ path: "codes.code", match: { active: true } }, { path: "createdBy" }]).exec()
    return shipments
  }
}

const shipmentService: ShipmentService = new ShipmentService()
export default shipmentService
