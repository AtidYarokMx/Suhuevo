/* lib */
import { type ClientSession } from 'mongoose'
/* app models */
import { AppErrorResponse } from '@app/models/app.response'
/* models */
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
/* dtos */
import { createFarmBody, updateFarmBody } from '@app/dtos/farm.dto'


class FarmService {
  async getOne(_id: string) {
    const farms = await FarmModel.findOne({ _id, active: true }).populate({
      path: "sheds",
      match: { active: true },
      populate: { path: "inventory" }
    }).exec()
    return farms
  }

  async getAll() {
    const farms = await FarmModel.aggregate([
      {
        $match: {
          active: true
        }
      },
      {
        $lookup: {
          from: "sheds",
          localField: "_id",
          foreignField: "farm",
          as: "sheds"
        }
      },
      {
        $unwind: {
          path: "$sheds",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "inventories",
          localField: "sheds._id",
          foreignField: "shed",
          as: "inventory"
        }
      },
      {
        $unwind: {
          path: "$inventory",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            farm: "$_id"
          },
          initialChickenTotal: {
            $sum: {
              $ifNull: ["$sheds.initialChicken", 0]
            }
          },
          mortality: {
            $sum: {
              $ifNull: ["$inventory.mortality", 0]
            }
          },
          water: {
            $sum: {
              $ifNull: ["$inventory.water", 0]
            }
          },
          food: {
            $sum: {
              $ifNull: ["$inventory.food", 0]
            }
          },
          original: {
            $push: "$$ROOT"
          }
        }
      },
      {
        $addFields: {
          summary: {
            food: "$food",
            water: "$water",
            mortality: "$mortality",
            initialChickenTotal: "$initialChickenTotal",
            totalChicken: {
              $subtract: [
                "$initialChickenTotal",
                "$mortality"
              ]
            }
          }
        }
      },
      {
        $project: {
          summary: 1,
          original: {
            $arrayElemAt: ["$original", 0]
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$original",
              {
                summary: "$summary"
              }
            ]
          }
        }
      },
      {
        $project: {
          sheds: 0,
          inventory: 0
        }
      }
    ])
    return farms
  }

  async getOneWithSheds(_id: string) {
    const farms = await FarmModel.findOne({ _id, active: true }).populate({
      path: "sheds",
      match: { active: true },
      populate: { path: "inventory" }
    }).exec()
    return farms
  }

  async getAllWithSheds() {
    const farms = await FarmModel.find({ active: true }).populate({
      path: "sheds",
      match: { active: true },
      populate: { path: "inventory" }
    }).exec()
    return farms
  }

  async create(body: createFarmBody, session: ClientSession) {
    const farm = new FarmModel({ ...body })
    const saved = await farm.save({ validateBeforeSave: true, session })
    return saved.toJSON()
  }

  async update(_id: string, body: updateFarmBody, session: ClientSession) {
    const farm = await FarmModel.findOne({ _id, active: true }, null, { session }).exec()
    if (farm == null) throw new AppErrorResponse({ statusCode: 404, name: "Granja no encontrada", description: "La granja ingresada es inexistente en el sistema o fue eliminada" })
    const updated = await FarmModel.updateOne({ _id }, { ...body }, { session, runValidators: true }).exec()
    return updated
  }
}

const farmService: FarmService = new FarmService()
export default farmService
