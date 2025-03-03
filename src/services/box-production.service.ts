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

  /**
   * Obtiene todas las cajas activas y su resumen opcionalmente.
   * @param summary - Si es `true`, devuelve un resumen del tipo de huevo producido.
   * @returns Lista de cajas y, opcionalmente, el resumen.
   */
  async getAll(summary: boolean = false) {
    const boxes = await BoxProductionModel.find({ active: true, status: 1 })
      .populate({
        path: "farm",
        select: "name",
        strictPopulate: false,
      })
      .populate({
        path: "shed",
        select: "name",
        strictPopulate: false,
      })
      .populate({
        path: "type",
        model: "catalog-box",
        select: "name",
        strictPopulate: false,
      })
      .lean();

    customLog("📦 Cajas encontradas:", boxes.length);

    const formattedBoxes = boxes.map(box => ({
      _id: box._id,
      code: box.code,
      farm: box.farm && !(box.farm instanceof ObjectId) ? (box.farm as { name: string }).name : "Desconocida",
      shed: box.shed && !(box.shed instanceof ObjectId) ? (box.shed as { name: string }).name : "Desconocida",
      type: box.type && !(box.type instanceof ObjectId) ? (box.type as { name: string }).name : "Desconocida",
      weight: box.netWeight,
      status: box.status,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    }));

    if (!summary) {
      return { boxes: formattedBoxes }
    }

    const allTypes = await CatalogBoxModel.find({}, { name: 1 }).lean();

    const summaryData = formattedBoxes.reduce((acc: Record<string, number>, box) => {
      const typeName = box.type || "Desconocida";
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {});

    const uniqueSummary = new Map<string, number>();

    allTypes.forEach(type => {
      uniqueSummary.set(type.name, summaryData[type.name] || 0);
    });

    const finalSummary = Array.from(uniqueSummary, ([type, value]) => ({ type, value }));
    finalSummary.sort((a, b) => a.type.localeCompare(b.type, "es", { numeric: true }));

    return {
      boxes: formattedBoxes,
      summary: finalSummary
    };
  }

  /**
   * Obtiene una caja por su código.
   * @param code - Código único de la caja.
   * @returns Caja encontrada o `null` si no existe.
   */
  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code })
    return box
  }

  async getByShedId(shedId: string) {
    customLog(`📌 Buscando códigos asignados al Shed ID: ${shedId}`);

    if (!ObjectId.isValid(shedId)) {
      throw new AppErrorResponse({ statusCode: 400, name: "Invalid Shed ID", message: "El ID del shed no es válido." });
    }

    const boxes = await BoxProductionModel.find({ shed: new ObjectId(shedId), active: true })
      .select("code shed status createdAt updatedAt")
      .lean();

    customLog(`📦 Códigos encontrados en el Shed ID ${shedId}: ${boxes.length}`);

    return { shedId, boxes };
  }

  /**
   * Envía cajas a ventas y actualiza su estado.
   * @param payload - Información de los códigos, placas y conductor.
   * @param session - Sesión de transacción de MongoDB.
   * @param locals - Información del usuario autenticado.
   * @returns Resultado de la actualización.
   */
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
   * Sincroniza los códigos de producción desde SQL Server a MongoDB.
   * @returns Resultado de la sincronización.
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

    const catalogBoxList = await CatalogBoxModel.find({}, { _id: 1, id: 1, count: 1, tare: 1 });
    const boxTypes = new Map(catalogBoxList.map(b => [b.id.toString(), { _id: b._id, count: b.count, tare: b.tare }]));

    customLog(`📦 BoxTypes cargados: ${JSON.stringify(Object.fromEntries(boxTypes))}`);

    let bulkOperations = validBoxes.map(box => {
      let objectId = existingCodes.get(box.codigo) || new ObjectId();
      const farmId = farms[box.id_granja] || new ObjectId();
      const shedId = sheds[`${farmId}-${box.id_caceta}`] || new ObjectId();
      const boxTypeId = boxTypes.get(box.tipo.toString())?._id || null;
      const boxType = boxTypes.get(box.tipo.toString()) ?? null;

      if (!boxType) {
        customLog(`⚠️ Tipo de caja no encontrado para tipo: ${box.tipo} en código: ${box.codigo}`);
      }

      const totalEggs = boxType ? boxType.count : 0;
      const grossWeight = Number(box.peso) * 10 || 0;
      const tareWeight = boxType ? Number(boxType.tare) : 0;
      const netWeight = grossWeight - tareWeight;

      customLog(`🔹 Código: ${box.codigo} | Tipo: ${box.tipo} | ID Mapeado: ${boxTypeId} | Count: ${boxType ? boxType.count : 'N/A'} | Tare: ${boxType ? boxType.tare : 'N/A'}`);

      if (boxType) {
        console.log(`✔️ Tipo encontrado: ${box.tipo} | Count: ${boxType.count} | Tare: ${boxType.tare}`);
      } else {
        console.warn(`⚠️ Tipo de caja no encontrado para tipo: ${box.tipo}`);
      }
      return {
        updateOne: {
          filter: { code: box.codigo },
          update: {
            $setOnInsert: {
              _id: objectId,
              code: box.codigo,
              farm: farmId,
              shed: shedId,
              type: boxType ? boxType._id : null,
              grossWeight,
              netWeight,
              status: box.status,
              totalEggs,
              createdAt: box.creacion,
              updatedAt: box.actualizacion
            }
          },
          upsert: true
        }
      };
    });

    if (!bulkOperations.length) throw new AppErrorResponse({ statusCode: 400, name: "No Valid Records", message: "No hay registros válidos para sincronizar." });

    let session = await BoxProductionModel.startSession();
    try {
      session.startTransaction();
      const result = await BoxProductionModel.bulkWrite(bulkOperations, { session });
      await session.commitTransaction();
      session.endSession();

      customLog(`✅ Sincronización completada: ${result.upsertedCount} códigos añadidos.`);
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new AppErrorResponse({ statusCode: 500, name: "SyncError", message: `Error al sincronizar: ${String(error)}` });
    }
  }

  /**
   * Obtiene un resumen de la cantidad de cajas de huevos producidas.
   * @param filters - Filtros opcionales para la consulta.
   * @param filters.startDate - Fecha de inicio (`YYYY-MM-DD`).
   * @param filters.endDate - Fecha de fin (`YYYY-MM-DD`).
   * @param filters.farmNumber - Número de granja para filtrar.
   * @param filters.shedNumber - Número de galpón para filtrar.
   * @param filters.status - Estado de las cajas.
   * @returns Lista de tipos de huevo con cantidad producida.
   */
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
      { $match: matchConditions },
      {
        $lookup: {
          from: "catalog-boxes",
          localField: "type",
          foreignField: "_id",
          as: "boxInfo",
        },
      },
      {
        $unwind: {
          path: "$boxInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$boxInfo._id",
          id: { $first: "$boxInfo.id" },
          name: { $first: "$boxInfo.name" },
          description: { $first: "$boxInfo.description" },
          quantity: { $sum: 1 },
          totalEggs: { $sum: "$totalEggs" }
        },
      },
      {
        $project: {
          _id: 1,
          id: 1,
          name: 1,
          description: 1,
          quantity: 1,
          totalEggs: 1,
        },
      },
    ]).exec();


    return summary;
  }

}

const boxProductionService: BoxProductionService = new BoxProductionService()
export default boxProductionService
