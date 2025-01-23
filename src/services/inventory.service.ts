/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { InventoryModel } from '@app/repositories/mongoose/models/inventory.model'
/* dtos */
import { updateInventoryBody, type createInventoryBody } from '@app/dtos/inventory.dto'
import { Types } from '@app/repositories/mongoose'


class InventoryService {
  async getOne(_id: string) {
    const inventory = await InventoryModel.findOne({ _id, active: true }).populate("shed").exec()
    return inventory
  }

  async getOneFromShed(id: string, idShed: string) {
    const inventory = await InventoryModel.findOne({ _id: id, shed: idShed, active: true }).populate("shed").exec()
    return inventory
  }

  async getAllFromShed(shedId: string) {
    const inventory = await InventoryModel.find({ active: true, shed: shedId }).populate("shed").exec()
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

  async reportFromFarm(farmId: string) {
    const inventory = await InventoryModel.aggregate([
      { $match: { active: true } },
      { $lookup: { from: "sheds", localField: "shed", foreignField: "_id", as: "shed" } },
      { $unwind: { path: "$shed", preserveNullAndEmptyArrays: true } },
      { $match: { "shed": { $ne: null } } },
      { $lookup: { from: "farms", localField: "shed.farm", foreignField: "_id", as: "shed.farm" } },
      { $unwind: { path: "$shed.farm", preserveNullAndEmptyArrays: true } },
      { $match: { "shed.farm": { $ne: null } } },
      { $match: { "shed.farm._id": new Types.ObjectId(farmId) } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          chicken: { $sum: "$chicken" },
          water: { $sum: "$water" },
          food: { $sum: "$food" }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $arrayElemAt: [
              ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
              {
                $subtract: ["$_id.month", 1]
              }
            ]
          },
          year: "$_id.year",
          chicken: 1,
          water: 1,
          food: 1
        }
      }
    ]).exec();

    return inventory;
  }

  async reportFromShed(shedId: string) {
    const inventory = await InventoryModel.aggregate([
      { $match: { shed: new Types.ObjectId(shedId), active: true } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          chicken: { $sum: "$chicken" },
          water: { $sum: "$water" },
          food: { $sum: "$food" }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $arrayElemAt: [
              ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
              {
                $subtract: ["$_id.month", 1]
              }
            ]
          },
          year: "$_id.year",
          chicken: 1,
          water: 1,
          food: 1
        }
      }
    ]).exec();

    return inventory;
  }
}

const inventoryService: InventoryService = new InventoryService()
export default inventoryService
