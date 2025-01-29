/* models */
import { ShipmentModel } from '@app/repositories/mongoose/models/shipment.model'


class ShipmentService {
  async getOne(_id: string) {
    const shipment = await ShipmentModel.findOne({ _id, active: true }).exec()
    return shipment
  }

  async getAll() {
    const shipments = await ShipmentModel.find({ active: true }).exec()
    return shipments
  }
}

const shipmentService: ShipmentService = new ShipmentService()
export default shipmentService
