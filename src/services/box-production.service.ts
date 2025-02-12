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

    // 🔹 Consulta los registros desde SQL Server
    const boxes = await AppSequelizeMSSQLClient.query<IBoxProductionSequelize>(
      "SELECT * FROM produccion_cajas WHERE status = 1",
      { type: QueryTypes.SELECT }
    );

    if (boxes.length <= 0) {
      throw new AppErrorResponse({
        statusCode: 404,
        name: "Codes Not Found",
        message: "No se encontraron códigos en la base de datos."
      });
    }

    // 🔹 Filtrar solo registros válidos con `codigo`
    const validBoxes = boxes.filter(box => box.codigo);
    if (validBoxes.length === 0) {
      throw new AppErrorResponse({
        statusCode: 400,
        name: "Invalid Data",
        message: "Los códigos obtenidos desde SQL son inválidos o vacíos."
      });
    }

    // 🔹 **Obtener las granjas y casetas existentes en MongoDB**
    const farms = await FarmModel.find({}, { _id: 1, farmNumber: 1 }).exec();
    const sheds = await ShedModel.find({}, { _id: 1, farm: 1, shedNumber: 1 }).exec();
    const catalogBoxes = await CatalogBoxModel.find({}, { _id: 1, id: 1 }).exec(); // 🔹 **Obtener catálogo de tipos de cajas**

    // 🔹 **Crear mapas para acceso rápido**
    const farmMap = Object.fromEntries(farms.map((farm) => [farm.farmNumber, farm._id]));
    const shedMap = Object.fromEntries(sheds.map((shed) => [`${shed.farm}-${shed.shedNumber}`, shed._id]));
    const boxTypeMap = Object.fromEntries(catalogBoxes.map((box) => [box.id, box._id])); // 🔹 **Mapeo de tipos de cajas**

    // 🔹 **Verificar qué códigos ya existen en MongoDB**
    const existingCodes = await BoxProductionModel.distinct("code", {
      code: { $in: validBoxes.map((box) => box.codigo) },
    });


    const bulkOperations: AnyBulkWriteOperation<IBoxProduction>[] = [];

    for (const box of validBoxes) {
      // 🔹 **Omitir códigos ya registrados**
      if (existingCodes.includes(box.codigo)) {
        customLog(`⚠️ Código ${box.codigo} ya registrado. Omitiendo...`);
        continue;
      }

      // 🔹 **Asignar granja `1` o "anónima" si no existe**
      const farmId = farmMap[box.id_granja] || farmMap[1] || new ObjectId();
      const shedId = shedMap[`${farmId}-${box.id_caceta}`] || Object.values(shedMap)[0] || new ObjectId();

      if (!farmId || !shedId) {
        customLog(`⚠️ No se encontró una granja/caseta para el código ${box.codigo}. Omitiendo...`);
        continue;
      }

      // 🔹 **Relacionar con el tipo de caja en el catálogo**
      const boxTypeId = boxTypeMap[box.tipo] || null; // Puede ser `null` si no se encuentra

      bulkOperations.push({
        updateOne: {
          filter: { code: box.codigo },
          update: {
            $setOnInsert: {
              _id: new ObjectId(), // 🔹 **ID único**
              farm: farmId,
              shed: shedId,
              type: boxTypeId, // 🔹 **Asociación con tipo de caja**
              weight: box.peso,
              status: box.status,
              createdAt: box.creacion,
              updatedAt: box.actualizacion,
            },
          },
          upsert: true, // 🔹 **Solo inserta si no existe**
        },
      });
    }

    if (bulkOperations.length === 0) {
      throw new AppErrorResponse({
        statusCode: 400,
        name: "No Valid Records",
        message: "No se encontraron registros válidos para sincronizar."
      });
    }

    // 🔹 **Ejecutar transacción para evitar inconsistencias**
    const session: ClientSession = await BoxProductionModel.startSession();
    session.startTransaction();

    try {
      const result = await BoxProductionModel.bulkWrite(bulkOperations, { session });
      await session.commitTransaction();
      customLog(`✅ Sincronización completada: ${result.upsertedCount} códigos nuevos añadidos.`);
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw new AppErrorResponse({
        statusCode: 500,
        name: "SyncError",
        message: `Error al sincronizar: ${String(error)}`,
      });
    } finally {
      session.endSession();
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
