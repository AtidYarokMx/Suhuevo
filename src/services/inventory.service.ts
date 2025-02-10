/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { InventoryModel } from '@app/repositories/mongoose/models/inventory.model'
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
/* dtos */
import { updateInventoryBody, type createInventoryBody } from '@app/dtos/inventory.dto'
import { Types } from '@app/repositories/mongoose'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'


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

  async create(body: createInventoryBody, locals: AppLocals) {
    const user = locals.user._id
    const inventory = new InventoryModel({ ...body, createdBy: user, lastUpdateBy: user })
    const saved = await inventory.save({ validateBeforeSave: true })
    return saved
  }

  async update(id: string, body: updateInventoryBody, session: ClientSession) {
    const inventory = await InventoryModel.updateOne({ _id: id }, { ...body }, { session }).exec()
    return inventory
  }

  async reportFromFarm(farmId: string) {
    const inventory = await FarmModel.aggregate([
      { $match: { active: true, _id: new Types.ObjectId(farmId) } },
      { $lookup: { from: "sheds", localField: "_id", foreignField: "farm", as: "shed" } },
      { $unwind: { path: "$shed", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "inventories", localField: "shed._id", foreignField: "shed", as: "inventory" } },
      { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          date: {
            $ifNull: ["$inventory.date", "$shed.createdAt"]
          }
        }
      },
      {
        $group: {
          _id: { farm: "$_id", month: { $month: "$date" }, year: { $year: "$date" } },
          chickenAdded: { $sum: { $ifNull: ["$inventory.chicken", 0] } },
          mortality: { $sum: { $ifNull: ["$inventory.mortality", 0] } },
          water: { $sum: { $ifNull: ["$inventory.water", 0] } },
          food: { $sum: { $ifNull: ["$inventory.food", 0] } },
          initialChicken: { $sum: { $ifNull: ["$shed.initialChicken", 0] } },
        }
      },
      {
        $addFields: {
          totalChicken: {
            $subtract: [
              { $add: ["$initialChicken", "$chickenAdded"] },
              "$mortality"
            ]
          }
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
          initialChicken: 1,
          totalChicken: 1,
          mortality: 1,
          water: 1,
          food: 1
        }
      },
      {
        $sort: {
          year: 1
        }
      }
    ]).exec();

    return inventory;
  }

  async reportFromShed(shedId: string) {
    const shed = await ShedModel.findById(shedId, { initialChicken: true }).exec();

    if (!shed)
      throw new AppErrorResponse({
        statusCode: 404,
        message: "Shed not found",
        name: "ShedNotFound",
        description: "No se encontró ninguna caseta con el id proporcionado"
      });

    const inventory = await InventoryModel.aggregate([
      { $match: { shed: new Types.ObjectId(shedId), active: true } },
      { $addFields: { initialChicken: shed.initialChicken } },
      {
        $group: {
          _id: {
            shed: "$shed",
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          chickenAdded: { $sum: "$chicken" },
          mortality: { $sum: "$mortality" },
          water: { $sum: "$water" },
          food: { $sum: "$food" },
          initialChicken: { $first: "$initialChicken" },
        }
      },
      {
        $addFields: {
          totalChicken: {
            $subtract: [
              { $add: ["$initialChicken", "$chickenAdded"] },
              "$mortality"
            ]
          }
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
          initialChicken: 1,
          totalChicken: 1,
          mortality: 1,
          water: 1,
          food: 1
        }
      },
      {
        $sort: {
          year: 1
        }
      }
    ]).exec();

    return inventory;
  }

  async getEggTypeSummary() {
    const summary = await InventoryModel.aggregate([
      { $match: { active: true } }, // Solo registros activos
      {
        $group: {
          _id: "$eggType",
          quantity: { $sum: 1 }, // Cuenta la cantidad de registros por tipo de huevo
        },
      },
      {
        $lookup: {
          from: "catalog-eggs", // Nombre de la colección del catálogo
          localField: "_id", // Campo de inventario a relacionar
          foreignField: "id", // Campo en el catálogo
          as: "eggInfo", // Resultado del catálogo
        },
      },
      {
        $unwind: {
          path: "$eggInfo",
          preserveNullAndEmptyArrays: true, // Permite mostrar tipos no relacionados
        },
      },
      {
        $project: {
          eggType: "$_id",
          quantity: 1,
          name: "$eggInfo.name", // Nombre del tipo de huevo
          description: "$eggInfo.description", // Descripción del tipo
        },
      },
    ]).exec();

    return summary;
  }
}

const inventoryService: InventoryService = new InventoryService()
export default inventoryService
