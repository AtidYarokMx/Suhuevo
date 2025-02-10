/* librerías externas */
import { type ClientSession } from 'mongoose'

/* modelos */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'

/* utilidades */
import { calculateWeekDifferenceFromToday } from '@app/utils/date.util'
import { customLog } from '@app/utils/util.util'

/* dtos e interfaces */
import { createShedBody, IShed, updateShedBody } from '@app/dtos/shed.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { Types } from '@app/repositories/mongoose'

/**
 * Clase de servicio para la gestión de casetas.
 */
class ShedService {
  /**
   * Obtiene una caseta activa por su identificador, incluyendo datos agregados de inventario y de la granja asociada.
   *
   * @param _id - Identificador de la caseta.
   * @returns Un objeto con la información de la caseta y su resumen.
   * @throws {AppErrorResponse} Si no se encuentra la caseta.
   */
  async getOne(_id: string) {
    try {
      customLog(`Iniciando búsqueda de caseta con id: ${_id}`)

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
              totalChicken: { $subtract: ["$initialChicken", "$mortality"] }
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
            newRoot: { $mergeObjects: ["$original", { summary: "$summary" }] }
          }
        },
        {
          $project: {
            original: 0,
            inventoryItems: 0
          }
        }
      ]).exec()

      if (sheds.length <= 0) {
        customLog(`Caseta no encontrada con id: ${_id}`)
        throw new AppErrorResponse({
          name: "Shed Not Found",
          statusCode: 404,
          code: "ShedNotFound",
          description: "No se encontró la caseta solicitada",
          message: "No se encontró la caseta solicitada"
        })
      }

      customLog(`Caseta encontrada correctamente con id: ${_id}`)
      return sheds[0]
    } catch (error: any) {
      customLog(`Error al obtener la caseta con id ${_id}: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene todas las casetas activas, con datos de inventario agrupados por mes y año, y resumen de la información.
   *
   * @returns Arreglo de casetas con sus respectivos resúmenes.
   * @throws {AppErrorResponse} En caso de error durante la consulta.
   */
  async getAll() {
    try {
      customLog(`Iniciando consulta de todas las casetas activas`)

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
              month: { $month: "$inventoryItems.date" },
              year: { $year: "$inventoryItems.date" }
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
              totalChicken: { $subtract: ["$initialChicken", "$mortality"] }
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
            newRoot: { $mergeObjects: ["$original", { summary: "$summary" }] }
          }
        },
        {
          $project: {
            original: 0,
            inventoryItems: 0
          }
        }
      ]).exec()

      customLog(`Se han obtenido ${inventory.length} casetas activas`)
      return inventory
    } catch (error: any) {
      customLog(`Error al obtener casetas: ${error.message}`)
      throw new AppErrorResponse({
        name: "ShedQueryError",
        statusCode: 500,
        code: "ShedQueryError",
        description: "Error al consultar las casetas",
        message: error.message
      })
    }
  }

  /**
   * Crea una nueva caseta.
   *
   * @param data - Objeto con los datos necesarios para crear la caseta, incluyendo "weeksChicken" para calcular la fecha de nacimiento.
   * @param session - Sesión activa de la base de datos.
   * @param locals - Variables locales de la aplicación (incluye información del usuario).
   * @returns Objeto JSON de la caseta creada.
   * @throws {AppErrorResponse} En caso de error durante la creación.
   */
  async create({ weeksChicken, ...body }: createShedBody, session: ClientSession, locals: AppLocals) {
    try {
      customLog(`Creación de caseta iniciada. weeksChicken: ${weeksChicken}, data: ${JSON.stringify(body)}`)

      const user = locals.user._id
      const chickenBirthDate = calculateWeekDifferenceFromToday(weeksChicken)
      const shed = new ShedModel({
        ...body,
        chickenBirth: chickenBirthDate,
        createdBy: user,
        lastUpdateBy: user
      })

      const saved = await shed.save({ validateBeforeSave: true, session })
      customLog(`Caseta creada exitosamente con id: ${saved._id}`)
      return saved.toJSON()
    } catch (error: any) {
      customLog(`Error al crear caseta: ${error.message}`)
      throw new AppErrorResponse({
        name: "ShedCreationError",
        statusCode: 500,
        code: "ShedCreationError",
        description: "Error al crear la caseta",
        message: error.message
      })
    }
  }

  /**
   * Actualiza la información de una caseta existente.
   *
   * @param _id - Identificador de la caseta a actualizar.
   * @param data - Datos nuevos para la caseta, pudiendo incluir "weeksChicken" o "farm".
   * @param session - Sesión activa de la base de datos.
   * @param locals - Variables locales de la aplicación (incluye información del usuario).
   * @returns La caseta actualizada.
   * @throws {AppErrorResponse} Si la caseta no existe o ocurre un error durante la actualización.
   */
  async update(
    _id: string,
    { weeksChicken, farm, ...body }: updateShedBody,
    session: ClientSession,
    locals: AppLocals
  ) {
    try {
      customLog(
        `Actualización de caseta iniciada. id: ${_id}, data: ${JSON.stringify({
          weeksChicken,
          farm,
          ...body
        })}`
      )

      const shed = await ShedModel.findOne({ _id, active: true }, null, { session }).exec()
      if (!shed) {
        customLog(`Caseta no encontrada para actualizar. id: ${_id}`)
        throw new AppErrorResponse({
          statusCode: 404,
          name: "Caseta no encontrada",
          description:
            "La caseta ingresada es inexistente en el sistema o fue eliminada",
          message: "Caseta no encontrada"
        })
      }

      const user = locals.user._id
      const updateBody: Partial<IShed> = { ...body }

      if (typeof farm !== "undefined") {
        updateBody.farm = new Types.ObjectId(farm)
      }

      if (typeof weeksChicken !== "undefined") {
        updateBody.chickenBirth = calculateWeekDifferenceFromToday(weeksChicken)
      }

      shed.set({ ...updateBody, lastUpdateBy: user })
      const updated = await shed.save({ validateBeforeSave: true, session })

      customLog(`Caseta actualizada exitosamente. id: ${_id}`)
      return updated
    } catch (error: any) {
      customLog(`Error al actualizar caseta con id ${_id}: ${error.message}`)
      throw new AppErrorResponse({
        name: "ShedUpdateError",
        statusCode: 500,
        code: "ShedUpdateError",
        description: "Error al actualizar la caseta",
        message: error.message
      })
    }
  }
}

const shedService: ShedService = new ShedService()
export default shedService
