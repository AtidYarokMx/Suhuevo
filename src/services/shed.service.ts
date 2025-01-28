/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
/* dtos */
import { createShedBody, updateShedBody } from '@app/dtos/shed.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { Types } from '@app/repositories/mongoose'


class ShedService {
  async getOne(_id: string) {
    const sheds = await ShedModel.aggregate([
      { $match: { active: true, _id: new Types.ObjectId(_id) } },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "shed",
          as: "inventoryItems"
        }
      },
      { $unwind: { path: "$inventoryItems", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "farms",
          localField: "farm",
          foreignField: "_id",
          as: "farm"
        }
      },
      { $unwind: { path: "$farm", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          mortality: { $sum: { $ifNull: ["$inventoryItems.mortality", 0] } },
          water: { $sum: { $ifNull: ["$inventoryItems.water", 0] } },
          food: { $sum: { $ifNull: ["$inventoryItems.food", 0] } },
          initialChicken: { $first: "$initialChicken" },
          original: { $push: "$$ROOT" }
        }
      },
      {
        $addFields: {
          summary: {
            food: "$food",
            water: "$water",
            mortality: "$mortality",
            totalChicken: { $subtract: ["$initialChicken", "$mortality"] },
          }
        }
      },
      {
        $project: {
          summary: 1,
          original: { $arrayElemAt: ["$original", 0] }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$original", { summary: "$summary" }]
          }
        }
      },
      {
        $project: {
          original: 0,
          inventoryItems: 0
        }
      }
    ]).exec()

    if (sheds.length <= 0)
      throw new AppErrorResponse({ name: "Shed Not Found", statusCode: 404, code: "ShedNotFound", description: "No se encontró la caseta solicitada", message: "No se encontró la caseta solicitada" })

    return sheds[0]
  }

  async getAll() {
    const inventory = await ShedModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "shed",
          as: "inventoryItems"
        }
      },
      { $unwind: { path: "$inventoryItems", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "farms",
          localField: "farm",
          foreignField: "_id",
          as: "farm"
        }
      },
      { $unwind: { path: "$farm", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            shed: "$_id",
            month: {
              $month: "$inventoryItems.date"
            },
            year: {
              $year: "$inventoryItems.date"
            }
          },
          mortality: { $sum: { $ifNull: ["$inventoryItems.mortality", 0] } },
          water: { $sum: { $ifNull: ["$inventoryItems.water", 0] } },
          food: { $sum: { $ifNull: ["$inventoryItems.food", 0] } },
          initialChicken: { $first: "$initialChicken" },
          original: { $push: "$$ROOT" }
        }
      },
      {
        $addFields: {
          summary: {
            food: "$food",
            water: "$water",
            mortality: "$mortality",
            totalChicken: { $subtract: ["$initialChicken", "$mortality"] },
          }
        }
      },
      {
        $project: {
          summary: 1,
          original: { $arrayElemAt: ["$original", 0] }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$original", { summary: "$summary" }]
          }
        }
      },
      {
        $project: {
          original: 0,
          inventoryItems: 0
        }
      }
    ]).exec()
    return inventory
  }

  async create(body: createShedBody, session: ClientSession, locals: AppLocals) {
    const user = locals.user._id
    const shed = new ShedModel({ ...body, createdBy: user, lastUpdateBy: user })
    const saved = await shed.save({ validateBeforeSave: true, session })
    return saved.toJSON()
  }

  async update(_id: string, body: updateShedBody, session: ClientSession, locals: AppLocals) {
    const shed = await ShedModel.findOne({ _id, active: true }, null, { session }).exec()
    if (shed == null) throw new AppErrorResponse({ statusCode: 404, name: "Caseta no encontrada", description: "La caseta ingresada es inexistente en el sistema o fue eliminada" })
    const user = locals.user._id
    shed.set({ ...body, lastUpdateBy: user })
    const updated = await shed.save({ validateBeforeSave: true, session })
    return updated
  }
}

const shedService: ShedService = new ShedService()
export default shedService
