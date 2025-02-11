/* librerías externas */
import { type ClientSession } from 'mongoose'

/* modelos */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
import { ShedHistoryModel } from '@app/repositories/mongoose/history/shed.history-model'

/* utilidades */
import { customLog } from '@app/utils/util.util'

/* dtos e interfaces */
import { createShedBody, initializeShedBody, ShedStatus } from '@app/dtos/shed.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { Types } from '@app/repositories/mongoose'
import { isValidStatusChange } from '@app/utils/validate.util'


/**
 * 📌 Servicio para la gestión de casetas (Sheds)
 */
class ShedService {

  /**
   * 📌 Obtiene el siguiente número de caseta disponible en una granja
   * @param farmId - ID de la granja
   * @param session - Sesión de base de datos para transacción
   * @returns Número de caseta disponible
   * @throws Error si no se puede obtener el número de caseta
   */
  private async getNextShedNumber(
    farmId: string,
    session: ClientSession
  ): Promise<number> {
    customLog(`📌 Buscando el último número de caseta para la granja ${farmId}...`);

    try {
      const lastShed = await ShedModel.findOne({ farm: farmId }, { shedNumber: 1 })
        .sort({ shedNumber: -1 })
        .session(session)
        .exec();

      let nextShedNumber = lastShed ? (lastShed.shedNumber ?? 0) + 1 : 1;

      // Asegurar que el número no esté en uso
      while (await ShedModel.exists({ farm: farmId, shedNumber: nextShedNumber }).session(session)) {
        nextShedNumber++;
      }

      customLog(`✅ Siguiente shedNumber disponible: ${nextShedNumber}`);
      return nextShedNumber;
    } catch (error) {
      customLog("❌ Error en getNextShedNumber:", error);
      throw new AppErrorResponse({
        name: "GetNextShedNumberError",
        statusCode: 500,
        message: "Error al obtener el siguiente número de caseta.",
      });
    }
  }

  /**
   * Crea una nueva caseta dentro de una granja con `shedNumber` único
   */
  async create(body: createShedBody, session: ClientSession, locals: AppLocals) {
    try {
      const user = locals.user._id;
      const { farm } = body;

      if (!farm) {
        throw new AppErrorResponse({
          name: "FarmRequiredError",
          statusCode: 400,
          message: "Es necesario especificar una granja para la caseta.",
        });
      }

      const shedNumber = body.shedNumber || (await this.getNextShedNumber(farm, session));
      customLog(`🔢 [Service] Asignado shedNumber: ${shedNumber}`);

      // Verificar que no exista un `shedNumber` duplicado en la misma granja
      const exists = await ShedModel.findOne({ farm, shedNumber }).session(session).exec();
      if (exists) {
        throw new AppErrorResponse({
          name: "ShedNumberInUseError",
          statusCode: 400,
          message: `El número de caseta ${shedNumber} ya está en uso en la granja ${farm}.`,
        });
      }

      const creationDate = new Date();
      const generationId = `${creationDate.getFullYear()}${(creationDate.getMonth() + 1).toString().padStart(2, "0")}${creationDate.getDate().toString().padStart(2, "0")}`;


      const shed = new ShedModel({
        ...body,
        shedNumber,
        createdBy: user,
        lastUpdateBy: user,
        initialChicken: 0,
        avgChickenWeight: 0,
        avgEggWeight: 0,
        foodConsumed: 0,
        waterConsumed: 0,
        mortality: 0,
        ageWeeks: 0,
        generationId,
        status: ShedStatus.INACTIVE,
      });

      const saved = await shed.save({ validateBeforeSave: true, session });

      customLog("✅ [Service] Caseta creada exitosamente:", saved);
      return saved.toJSON();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🚀 Inicializa una caseta y cambia su estado a "production"
   * @param _id - ID de la caseta a inicializar
   * @param body - Datos obligatorios para la inicialización
   * @param session - Sesión de base de datos
   * @param locals - Datos del usuario autenticado
   * @returns Caseta actualizada
   * @throws Error si la caseta no puede ser inicializada
   */
  async initializeShed(
    _id: string,
    body: initializeShedBody,
    session: ClientSession,
    locals: AppLocals
  ) {
    session.startTransaction();
    try {
      const user = locals.user._id;
      const shed = await ShedModel.findOne({ _id, active: true }).session(session).exec();

      if (!shed) {
        throw new AppErrorResponse({
          statusCode: 404,
          name: "ShedNotFound",
          message: "La caseta no existe o está inactiva.",
        });
      }

      // Solo se puede inicializar si el estado actual es "readyToProduction"
      if (shed.status !== ShedStatus.READY_TO_PRODUCTION) {
        throw new AppErrorResponse({
          statusCode: 400,
          name: "InvalidStatus",
          message: "Solo se puede inicializar una caseta que esté en estado 'readyToProduction'.",
        });
      }

      // Generar un ID único para la parvada
      const generationId = new Date().toISOString().split("T")[0].replace(/-/g, "");

      // Actualizar la caseta con los datos de inicialización
      shed.set({
        initialChicken: body.initialChicken,
        ageWeeks: body.ageWeeks,
        avgHenWeight: body.avgHenWeight,
        avgEggWeight: 0,
        foodConsumed: 0,
        waterConsumed: 0,
        mortality: 0,
        generationId,
        status: ShedStatus.PRODUCTION,
        lastUpdateBy: user,
      });

      const updated = await shed.save({ validateBeforeSave: true, session });

      await session.commitTransaction();
      customLog(`✅ Caseta inicializada con éxito en estado 'production'`);
      session.endSession();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * 🔄 Cambia el estado de una caseta asegurando el flujo correcto
   * @param _id - ID de la caseta
   * @param newStatus - Nuevo estado permitido
   * @param session - Sesión de base de datos
   * @param locals - Datos del usuario autenticado
   * @returns Caseta con estado actualizado
   * @throws Error si el estado no es válido
   */
  async changeShedStatus(
    _id: string,
    newStatus: ShedStatus,
    session: ClientSession,
    locals: AppLocals
  ) {
    session.startTransaction();
    try {
      const user = locals.user._id;
      const shed = await ShedModel.findOne({ _id, active: true }).session(session).exec();

      if (!shed) {
        throw new AppErrorResponse({
          statusCode: 404,
          name: "ShedNotFound",
          message: "La caseta no existe o está inactiva.",
        });
      }

      // Validación del flujo de estados
      const validTransitions = {
        [ShedStatus.INACTIVE]: [ShedStatus.CLEANING],
        [ShedStatus.CLEANING]: [ShedStatus.READY_TO_PRODUCTION],
        [ShedStatus.READY_TO_PRODUCTION]: [ShedStatus.PRODUCTION], // Solo mediante `initializeShed`
        [ShedStatus.PRODUCTION]: [ShedStatus.INACTIVE], // Finalización de la parvada
      };

      if (!validTransitions[shed.status]?.includes(newStatus)) {
        throw new AppErrorResponse({
          statusCode: 400,
          name: "InvalidStatusChange",
          message: `No se puede cambiar el estado de '${shed.status}' a '${newStatus}'.`,
        });
      }


      // Si el estado cambia a "inactive" después de "production", se finaliza la parvada
      if (shed.status === ShedStatus.PRODUCTION && newStatus === ShedStatus.INACTIVE) {
        await ShedHistoryModel.create([
          {
            shedId: shed._id,
            generationId: shed.generationId,
            initialChicken: shed.initialChicken,
            mortality: shed.mortality,
            foodConsumed: shed.foodConsumed,
            waterConsumed: shed.waterConsumed,
            eggProduction: shed.eggProduction,
            ageWeeks: shed.ageWeeks,
            status: shed.status,
            recordedBy: user,
            change: shed.toObject(),
          },
        ]);

        // Restablecer valores de la caseta
        shed.set({
          initialChicken: 0,
          avgEggWeight: 0,
          foodConsumed: 0,
          waterConsumed: 0,
          mortality: 0,
          eggProduction: 0,
          ageWeeks: 0,
          generationId: null,
          status: ShedStatus.INACTIVE,
          lastUpdateBy: user,
        });
      } else {
        shed.status = newStatus;
        shed.lastUpdateBy = user;
      }

      const updated = await shed.save({ validateBeforeSave: true, session });

      await session.commitTransaction();
      session.endSession();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async updateShedData(_id: string, body: any, session: ClientSession, locals: AppLocals) {
    session.startTransaction();
    try {
      const user = locals.user._id;
      const shed = await ShedModel.findOne({ _id, active: true }).session(session).exec();

      if (!shed) {
        throw new AppErrorResponse({
          statusCode: 404,
          name: "ShedNotFound",
          message: "La caseta no existe o está inactiva.",
        });
      }

      // Validar cambio de estado
      if (body.status && !isValidStatusChange(shed.status, body.status)) {
        throw new AppErrorResponse({
          statusCode: 400,
          name: "InvalidStatusChange",
          message: `No se puede cambiar el estado de '${shed.status}' a '${body.status}'.`,
        });
      }

      // Guardar historial antes de modificar la caseta
      await ShedHistoryModel.create([
        {
          shedId: shed._id,
          generationId: shed.generationId,
          initialChicken: shed.initialChicken,
          mortality: shed.mortality,
          foodConsumed: shed.foodConsumed,
          waterConsumed: shed.waterConsumed,
          eggProduction: shed.eggProduction,
          ageWeeks: shed.ageWeeks,
          status: shed.status,
          recordedBy: user,
        },
      ]);

      // Actualizar datos con los nuevos valores
      shed.set({
        initialChicken: body.initialChicken ?? shed.initialChicken,
        mortality: shed.mortality + (body.mortality || 0),
        foodConsumed: shed.foodConsumed + (body.foodConsumed || 0),
        waterConsumed: shed.waterConsumed + (body.waterConsumed || 0),
        avgEggWeight: body.avgEggWeight ?? shed.avgEggWeight,
        status: body.status ?? shed.status,
        lastUpdateBy: user,
      });

      // Calcular producción de huevo
      if (body.eggBoxes) {
        shed.eggProduction = body.eggBoxes.reduce((total: number, box: any) => {
          return total + box.quantity * box.eggCount;
        }, 0);
      }

      const updated = await shed.save({ validateBeforeSave: true, session });

      await session.commitTransaction();
      session.endSession();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
  * Obtiene el historial de una caseta con opción de filtrar por rango de fechas.
  * @param shedId - ID de la caseta.
  * @param startDate - Fecha de inicio (opcional).
  * @param endDate - Fecha de fin (opcional).
  */
  async getShedHistory(shedId: string, startDate?: string, endDate?: string) {
    const query: any = { shedId: shedId };

    if (startDate) {
      query.recordedAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.recordedAt = { ...query.recordedAt, $lte: new Date(endDate) };
    }

    return await ShedHistoryModel.find(query)
      .sort({ recordedAt: -1 })
      .populate("recordedBy", "name")
      .exec();
  }

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
}

const shedService: ShedService = new ShedService()
export default shedService
