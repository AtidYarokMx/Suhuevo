/* lib */
import { QueryTypes } from 'sequelize'
import { AnyBulkWriteOperation, AnyKeys, AnyObject, ClientSession } from 'mongoose'
/* repos */
import { AppSequelizeMSSQLClient } from '@app/repositories/sequelize'
/* models */
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model'
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
/* utils */
import { customLog } from '@app/utils/util.util'
/* dtos */
import { IBoxProduction, IBoxProductionSequelize, sendBoxesToSellsBody } from '@app/dtos/box-production.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { ShipmentModel } from '@app/repositories/mongoose/models/shipment.model'
import { z } from 'zod'
import { IShipmentCode } from '@app/dtos/shipment.dto'
import { ObjectId } from 'mongodb'
import { CatalogBoxModel } from '@app/repositories/mongoose/catalogs/box.catalog'

class BoxProductionService {
  async getAll() {
    const boxes = await BoxProductionModel.find({ active: true, status: 1 })
    return boxes
  }

  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code })
    return box
  }

  async sendBoxesToSells({ codes, plates, driver }: z.infer<typeof sendBoxesToSellsBody>, session: ClientSession, locals: AppLocals) {
    const ids = await BoxProductionModel.find({ active: true, status: 1, code: { $in: codes } }, { _id: true }, { session }).exec()

    if (ids.length <= 0)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", description: "No se encontró ningún código", code: "CodesNotFound", message: "No se encontraron códigos con los parámetros seleccionados" })

    const updated = await BoxProductionModel.updateMany({ active: true, status: 1, code: { $in: codes } }, { status: 2 }, { session, runValidators: true }).exec()
    const user = locals.user._id
    const codeItems = ids.map<IShipmentCode>((item, index) => ({ code: item._id }))
    const shipment = new ShipmentModel({ name: "Envío de Producción a Ventas", codes: codeItems, vehiclePlates: plates, driver, createdBy: user, lastUpdateBy: user })
    await shipment.save({ session, validateBeforeSave: true })
    return updated
  }

  /**
   * 🔄 **Sincroniza los códigos de producción desde SQL a MongoDB**
   * @route POST /api/boxes/sync
   * @returns Resultado de la sincronización
   */
  async synchronize() {
    customLog("📌 Iniciando sincronización de códigos...");

    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>(
      "SELECT * FROM produccion_cajas WHERE status = 1",
      { type: QueryTypes.SELECT }
    );
    if (!boxes.length) throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", message: "No se encontraron códigos." });

    const validBoxes = boxes.filter(box => box.codigo && box.codigo.trim() !== "");
    if (!validBoxes.length) throw new AppErrorResponse({ statusCode: 400, name: "Invalid Data", message: "Códigos inválidos o vacíos." });

    const existingDocuments = await BoxProductionModel.find({ code: { $in: validBoxes.map(box => box.codigo) } }, { _id: 1, code: 1 });
    const existingCodes = new Map(existingDocuments.map(doc => [doc.code, doc._id]));

    const farms = Object.fromEntries((await FarmModel.find({}, { _id: 1, farmNumber: 1 })).map(f => [f.farmNumber, f._id]));
    const sheds = Object.fromEntries((await ShedModel.find({}, { _id: 1, farm: 1, shedNumber: 1 })).map(s => [`${s.farm}-${s.shedNumber}`, s._id]));
    const boxTypes = Object.fromEntries((await CatalogBoxModel.find({}, { _id: 1, id: 1 })).map(b => [b.id, b._id]));

    let bulkOperations: AnyBulkWriteOperation<IBoxProduction>[] = validBoxes.map(box => {
      let objectId = existingCodes.get(box.codigo) || new ObjectId();

      customLog(`🔹 Código ${box.codigo} -> ID: ${objectId}`);

      const farmId = farms[box.id_granja] || new ObjectId();
      const shedId = sheds[`${farmId}-${box.id_caceta}`] || new ObjectId();

      return {
        updateOne: {
          filter: { code: box.codigo },
          update: {
            $setOnInsert: {
              _id: objectId,
              code: box.codigo,
              farm: farmId,
              shed: shedId,
              type: boxTypes[box.tipo] || null,
              weight: box.peso,
              status: box.status,
              createdAt: box.creacion,
              updatedAt: box.actualizacion
            }
          },
          upsert: true
        }
      };
    });

    if (!bulkOperations.length) throw new AppErrorResponse({ statusCode: 400, name: "No Valid Records", message: "No hay registros válidos para sincronizar." });

    let session: ClientSession | null = null;
    try {
      session = await BoxProductionModel.startSession();
      session.startTransaction();

      const result = await BoxProductionModel.bulkWrite(bulkOperations, { session });
      await session.commitTransaction();
      session.endSession();

      if (result.upsertedCount === 0) {
        customLog("⚠️ Ningún código fue insertado. Revisando posibles errores...");
      } else {
        customLog(`✅ Sincronización completada: ${result.upsertedCount} códigos añadidos.`);
        return result;
      }
    } catch (error: any) {
      if (session) await session.abortTransaction().catch(() => { });
      if (session) session.endSession().catch(() => { });

      if (error.code === 11000) {
        customLog("⚠️ Error de clave duplicada detectado. Generando nuevos IDs y reintentando...");
        bulkOperations = bulkOperations.map(op => {
          if ('updateOne' in op) {
            return {
              updateOne: {
                filter: op.updateOne.filter,
                update: {
                  ...op.updateOne.update,
                  $setOnInsert: { ...op.updateOne.update.$setOnInsert, _id: new ObjectId() }
                }
              },
              upsert: true
            };
          }
          return op;
        });

        try {
          session = await BoxProductionModel.startSession();
          session.startTransaction();
          const retryResult = await BoxProductionModel.bulkWrite(bulkOperations, { session });
          await session.commitTransaction();
          session.endSession();

          if (retryResult.upsertedCount === 0) {
            customLog("⚠️ Reintento realizado, pero ningún código nuevo fue insertado.");
          } else {
            customLog(`✅ Reintento exitoso: ${retryResult.upsertedCount} códigos añadidos.`);
          }

          return retryResult;
        } catch (retryError) {
          if (session) await session.abortTransaction().catch(() => { });
          if (session) session.endSession().catch(() => { });
          throw new AppErrorResponse({ statusCode: 500, name: "SyncError", message: `Error en reintento de sincronización: ${String(retryError)}` });
        }
      }
      throw new AppErrorResponse({ statusCode: 500, name: "SyncError", message: `Error al sincronizar: ${String(error)}` });
    }
  }

  async getEggTypeSummaryFromBoxes(filters: { startDate?: string; endDate?: string; farmNumber?: number; shedNumber?: number; status?: number }) {
    console.log("Query Params:", filters);
    const matchConditions: any = { active: true };

    // Filtros opcionales
    if (filters.startDate || filters.endDate) {
      matchConditions.createdAt = {};
      if (filters.startDate) matchConditions.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchConditions.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.farmNumber) matchConditions.farmNumber = filters.farmNumber;
    if (filters.shedNumber) matchConditions.shedNumber = filters.shedNumber;
    if (filters.status) matchConditions.status = filters.status;

    const summary = await BoxProductionModel.aggregate([
      { $match: matchConditions }, // Aplicar los filtros dinámicos
      {
        $group: {
          _id: "$type", // Agrupar por tipo de huevo
          quantity: { $sum: 1 }, // Contar la cantidad de cada tipo de caja
        },
      },
      {
        $lookup: {
          from: "catalog-eggs", // Nombre de la colección del catálogo de huevos
          localField: "_id", // Relacionar con el tipo de huevo
          foreignField: "id", // ID en el catálogo
          as: "eggInfo", // Relación con el catálogo
        },
      },
      {
        $unwind: {
          path: "$eggInfo",
          preserveNullAndEmptyArrays: true, // Permitir mostrar tipos sin relación
        },
      },
      {
        $project: {
          eggType: "$_id",
          quantity: 1,
          name: "$eggInfo.name",
          description: "$eggInfo.description",
        },
      },
    ]).exec();

    return summary;
  }


}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
