/* lib */
import { ObjectId } from "mongodb";
import { QueryTypes } from "sequelize";
import { AnyBulkWriteOperation, RootFilterQuery } from "mongoose";
/* repos */
import { AppSequelizeMSSQLClient } from "@app/repositories/sequelize";
/* models */
import { BoxProductionModel } from "@app/repositories/mongoose/models/box-production.model";
import { BoxCategoryModel } from "@app/repositories/mongoose/catalogs/box-category.catalog";
import { CatalogBoxModel } from "@app/repositories/mongoose/catalogs/box.catalog";
import { FarmModel } from "@app/repositories/mongoose/models/farm.model";
import { ShedModel } from "@app/repositories/mongoose/models/shed.model";
/* utils */
import { customLog } from "@app/utils/util.util";
import { ifNotValueReturnZero } from "@app/utils/number";
import { hasValidProperty } from "@app/utils/object.util";
/* dtos */
import { IBoxProduction, IBoxProductionSequelize } from "@app/dtos/box-production.dto";
import { AppErrorResponse } from "@app/models/app.response";
import { IBoxCategory } from "@app/dtos/box-category.dto";
import { ICatalogBox } from "@app/dtos/box-catalog.dto";
import { IFarm } from "@app/dtos/farm.dto";
import { IShed } from "@app/dtos/shed.dto";

class BoxProductionService {
  /**
   * Obtiene todas las cajas activas y su resumen opcionalmente.
   * @param summary - Si es `true`, devuelve un resumen del tipo de huevo producido.
   * @returns Lista de cajas y, opcionalmente, el resumen.
   */
  async getAll(
    limit?: number,
    startDate?: string,
    endDate?: string,
    status?: number,
    includeStatus99: boolean = false,
    farm?: string,
    shed?: string,
    type?: string,
    category?: string
  ) {
    customLog("📌 Iniciando consulta de códigos de producción...");

    const matchConditions: RootFilterQuery<IBoxProduction> = { active: true };

    // 🔹 Filtrado por status
    if (status !== undefined) {
      matchConditions.status = status;
    } else if (!includeStatus99) {
      matchConditions.status = { $ne: 99 }; // Excluir status 99 si no se indica lo contrario
    }

    // 🔹 Filtrado por rango de fechas
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    // 🔹 Filtrado por Granja (farm)
    if (farm && ObjectId.isValid(farm)) {
      matchConditions.farm = new ObjectId(farm);
    }

    // 🔹 Filtrado por Caseta (shed)
    if (shed && ObjectId.isValid(shed)) {
      matchConditions.shed = new ObjectId(shed);
    }

    // 🔹 Filtrado por Tipo de Caja (type)
    if (type && ObjectId.isValid(type)) {
      matchConditions.type = new ObjectId(type);
    }

    // 🔹 Filtrado por Categoría (category)
    if (category && ObjectId.isValid(category)) {
      const categoryTypes = await CatalogBoxModel.find({ category: new ObjectId(category) })
        .select("_id")
        .lean();
      matchConditions.type = { $in: categoryTypes.map((t) => t._id) };
    }

    // 🔹 LOGS: Mostrar condiciones de filtrado
    customLog("🔍 Condiciones de filtrado:", JSON.stringify(matchConditions, null, 2));

    // 🔹 Consulta a la base de datos
    const boxes = await BoxProductionModel.find(matchConditions)
      .populate<{ farm: IFarm }>({ path: "farm", select: "name" })
      .populate<{ shed: IShed }>({ path: "shed", select: "name" })
      .populate<{ type: ICatalogBox & { category: ICatalogBox } }>({
        path: "type",
        model: "catalog-box",
        select: "name category",
        populate: {
          path: "category",
          model: "box-category",
          select: "name",
        },
      })
      .limit(limit ?? 1000000) // 🔹 Limita los resultados según el parámetro recibido
      .exec();

    // 🔹 Consulta a la base de datos para obtener el peso total y la cantidad total de cajas en caso de que se haya usado el filter y no depender del length
    const totalWeight = await BoxProductionModel.aggregate([
      { $match: matchConditions },
      { $group: { _id: null, totalBoxes: { $sum: 1 }, totalWeight: { $sum: "$netWeight" } } },
    ]).exec();

    customLog(`📦 Códigos encontrados: ${boxes.length}`);

    // 🔹 Formatear los resultados
    const formattedBoxes = boxes.map((box) => ({
      _id: box._id,
      code: box.code,
      farm: hasValidProperty(box.farm, "name") ? box.farm.name : "Desconocida",
      shed: hasValidProperty(box.shed, "name") ? box.shed.name : "Desconocida",
      type: hasValidProperty(box.type, "name") ? box.type.name : "Desconocido",
      category:
        hasValidProperty(box.type, "category") && hasValidProperty(box.type.category, "name")
          ? box.type.category.name
          : "Sin categoría",
      weight: box.netWeight,
      status: box.status,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    }));

    // 🔹 Obtener todas las categorías y tipos de caja
    const allTypes = await CatalogBoxModel.find({}, { _id: 1, name: 1, category: 1 }).populate<{
      category: IBoxCategory;
    }>("category");

    // 🔹 LOGS: Mostrar tipos de caja y categorías
    customLog(`📦 Tipos de caja encontrados: ${allTypes.length}`);

    const countByType = new Map<string, { category: string; count: number }>();

    for (const box of boxes) {
      const typeName = hasValidProperty(box.type, "name") ? box.type?.name : "Desconocido";
      const categoryName =
        hasValidProperty(box.type, "category") && hasValidProperty(box.type.category, "name")
          ? box.type.category.name
          : "Sin categoría";

      if (!countByType.has(typeName)) {
        countByType.set(typeName, { category: categoryName, count: 0 });
      }

      countByType.get(typeName)!.count++;
    }

    // 🔹 Asegurar que el `summary` incluya todos los tipos de cajas, incluso los no encontrados en la consulta
    const summaryData = allTypes.map((t) => ({
      category: hasValidProperty(t.category, "name") ? t.category.name : "Sin Categoría",
      type: t.name,
      count: countByType.get(t.name)?.count || 0,
    }));

    // 🔹 LOGS: Mostrar el resumen generado
    customLog("📊 Resumen generado:", JSON.stringify(summaryData, null, 2));

    return {
      summary: summaryData,
      boxes: formattedBoxes,
      totalRecords: ifNotValueReturnZero(totalWeight?.[0]?.totalBoxes),
      totalWeight: ifNotValueReturnZero(totalWeight?.[0].totalWeight),
    };
  }

  /**
   * Obtiene una caja por su código.
   * @param code - Código único de la caja.
   * @returns Caja encontrada o `null` si no existe.
   */
  async getOne(code: string) {
    const box = await BoxProductionModel.find({ active: true, code });
    return box;
  }

  async getSummary(shedId?: string, startDate?: string, endDate?: string, type?: string) {
    customLog("📌 Generando resumen de producción...");
    const matchConditions: any = { active: true };
    if (shedId && ObjectId.isValid(shedId)) matchConditions.shed = new ObjectId(shedId);
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }
    if (type && type !== "all" && ObjectId.isValid(type)) matchConditions.type = new ObjectId(type);

    const summary = await BoxProductionModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: "catalog-boxes",
          localField: "type",
          foreignField: "_id",
          as: "boxType",
        },
      },
      { $unwind: "$boxType" },
      {
        $lookup: {
          from: "box-categories",
          localField: "boxType.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          category: { $first: "$category.name" },
          count: { $sum: 1 },
          totalGrossWeight: { $sum: "$grossWeight" },
          totalNetWeight: { $sum: "$netWeight" },
          totalEggs: { $sum: "$totalEggs" },
        },
      },
      {
        $project: {
          _id: 0,
          category: 1,
          count: 1,
          totalGrossWeight: 1,
          totalNetWeight: 1,
          totalEggs: 1,
        },
      },
    ]).exec();
    if (type === "all") {
      const allCategories = await BoxCategoryModel.find({}, { name: 1 }).lean();
      const categoryMap = new Map(
        summary.map(({ category, count, totalGrossWeight, totalNetWeight, totalEggs }) => [
          category,
          { count, totalGrossWeight, totalNetWeight, totalEggs },
        ])
      );
      return {
        summary: allCategories.map(({ name }) => ({
          category: name,
          count: categoryMap.get(name)?.count || 0,
          totalGrossWeight: categoryMap.get(name)?.totalGrossWeight || 0,
          totalNetWeight: categoryMap.get(name)?.totalNetWeight || 0,
          totalEggs: categoryMap.get(name)?.totalEggs || 0,
        })),
      };
    }
    return { summary };
  }

  async getByShedId(
    shedId: string,
    startDate?: string,
    endDate?: string,
    type?: string,
    category?: string,
    summary?: boolean
  ) {
    customLog(`📌 Buscando códigos asignados al Shed ID: ${shedId}`);

    if (!ObjectId.isValid(shedId)) {
      throw new AppErrorResponse({ statusCode: 400, name: "Invalid Shed ID", message: "El ID del shed no es válido." });
    }

    const matchConditions: any = { shed: new ObjectId(shedId), active: true };

    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (type && ObjectId.isValid(type)) {
      matchConditions.type = new ObjectId(type);
    }

    if (category && ObjectId.isValid(category)) {
      const categoryTypes = await CatalogBoxModel.find({ category: new ObjectId(category) })
        .select("_id")
        .lean();
      matchConditions.type = { $in: categoryTypes.map((t) => t._id) };
    }

    const boxes = await BoxProductionModel.find(matchConditions)
      .select("_id code shed type status createdAt updatedAt")
      .populate({
        path: "type",
        model: "catalog-box",
        select: "name category",
        populate: {
          path: "category",
          model: "box-category",
          select: "name",
        },
      })
      .lean();

    customLog(`📦 Códigos encontrados en el Shed ID ${shedId}: ${boxes.length}`);

    let summaryData: { category: string; type: string; count: number }[] = [];

    if (summary) {
      const allTypes = await CatalogBoxModel.find({}, { _id: 1, name: 1, category: 1 })
        .populate("category", "name")
        .lean();

      const countByType = boxes.reduce((acc: Record<string, { category: string; count: number }>, box) => {
        const type = box.type as { name?: string; category?: { name?: string } } | undefined;
        const typeName = type?.name ?? "Desconocido";
        const categoryName = type?.category?.name ?? "Sin Categoría";

        if (!acc[typeName]) {
          acc[typeName] = { category: categoryName, count: 0 };
        }
        acc[typeName].count += 1;

        return acc;
      }, {});

      summaryData = Object.entries(countByType).map(([type, { category, count }]) => ({
        category,
        type,
        count,
      }));

      if (type === "all") {
        summaryData = allTypes.map((t) => ({
          category: (t.category as { name?: string })?.name ?? "Sin Categoría",
          type: t.name,
          count: countByType[t.name]?.count ?? 0,
        }));
      }

      summaryData.sort(
        (a, b) =>
          a.category.localeCompare(b.category, "es", { numeric: true }) ||
          a.type.localeCompare(b.type, "es", { numeric: true })
      );
    }

    return {
      shedId,
      startDate,
      endDate,
      type,
      category,
      boxes,
      ...(summary ? { summary: summaryData } : {}),
    };
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
    if (!boxes.length)
      throw new AppErrorResponse({ statusCode: 404, name: "Codes Not Found", message: "No se encontraron códigos." });

    const validBoxes = boxes.filter((box) => box.codigo && box.codigo.trim() !== "");
    if (!validBoxes.length)
      throw new AppErrorResponse({ statusCode: 400, name: "Invalid Data", message: "Códigos inválidos o vacíos." });

    const existingDocuments = await BoxProductionModel.find(
      { code: { $in: validBoxes.map((box) => box.codigo) } },
      { _id: 1, code: 1 }
    );
    const existingCodes = new Map(existingDocuments.map((doc) => [doc.code, doc._id]));

    const farms = Object.fromEntries(
      (await FarmModel.find({}, { _id: 1, farmNumber: 1 })).map((f) => [f.farmNumber, f._id])
    );
    const sheds = Object.fromEntries(
      (await ShedModel.find({}, { _id: 1, farm: 1, shedNumber: 1 })).map((s) => [`${s.farm}-${s.shedNumber}`, s._id])
    );

    const catalogBoxList = await CatalogBoxModel.find({}, { _id: 1, id: 1, category: 1, count: 1, tare: 1 });
    const boxTypes = new Map(
      catalogBoxList.map((b) => [b.id.toString(), { _id: b._id, category: b.category, count: b.count, tare: b.tare }])
    );

    customLog(`📦 BoxTypes cargados: ${JSON.stringify(Object.fromEntries(boxTypes))}`);
    let bulkOperations: AnyBulkWriteOperation[] = [];

    for (const box of validBoxes) {
      let objectId = existingCodes.get(box.codigo) || new ObjectId();
      const farmId = farms[box.id_granja] || new ObjectId();
      const shedId = sheds[`${farmId}-${box.id_caceta}`] || new ObjectId();
      const boxType = boxTypes.get(box.tipo.toString()) ?? null;

      if (!boxType) {
        customLog(`⚠️ Tipo de caja no encontrado para tipo: ${box.tipo} en código: ${box.codigo}`);
        continue;
      }

      const totalEggs = boxType.count;
      const grossWeight = Number(box.peso) * 10 || 0;
      const tareWeight = boxType.tare || 0;
      const netWeight = grossWeight - tareWeight;

      bulkOperations.push({
        updateOne: {
          filter: { code: box.codigo },
          update: {
            $setOnInsert: {
              _id: objectId,
              code: box.codigo,
              farm: farmId,
              shed: shedId,
              type: boxType._id,
              category: boxType.category,
              grossWeight,
              netWeight,
              status: box.status,
              totalEggs,
              createdAt: box.creacion,
              updatedAt: box.actualizacion,
            },
          },
          upsert: true,
        },
      });

      // 🔄 Actualizar `dailyRecord` y `weeklyRecord` al mismo tiempo
      await this.updateRecords(shedId, totalEggs, grossWeight);
    }

    if (!bulkOperations.length)
      throw new AppErrorResponse({
        statusCode: 400,
        name: "No Valid Records",
        message: "No hay registros válidos para sincronizar.",
      });

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
      throw new AppErrorResponse({
        statusCode: 500,
        name: "SyncError",
        message: `Error al sincronizar: ${String(error)}`,
      });
    }
  }

  /**
   * 🔄 Actualiza o crea un `dailyRecord` y actualiza el `weeklyRecord` correspondiente.
   */
  async updateRecords(shedId: ObjectId, totalEggs: number, grossWeight: number) {
    const today = new Date().toISOString().split("T")[0]; // Fecha actual sin hora
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const isWednesdayOrLater = currentDay >= 3;

    // 🔄 Actualiza el dailyRecord
    await ShedModel.updateOne(
      { _id: shedId },
      {
        $set: { updatedAt: new Date() },
        $push: {
          dailyRecords: {
            date: today,
            totalEggsProduced: totalEggs,
            grossWeight,
          },
        },
        $inc: {
          "weeklyRecord.totalEggsProduced": totalEggs,
          "weeklyRecord.totalGrossWeight": grossWeight,
        },
      }
    );

    customLog(`✅ dailyRecord y weeklyRecord actualizados para la caseta ${shedId}`);
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
  async getEggTypeSummaryFromBoxes(filters: {
    startDate?: string;
    endDate?: string;
    farmNumber?: number;
    shedNumber?: number;
    status?: number;
  }) {
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
          totalEggs: { $sum: "$totalEggs" },
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

  async markBoxAsInvalid(code: string, password: string): Promise<{ success: boolean; message: string }> {
    const correctPassword = process.env.BOX_INVALIDATION_PASSWORD || "defaultpassword"; // 🔹 Usa una variable de entorno
    customLog(`🔒 Contraseña de invalidación recibida: ${password}`);

    if (password !== correctPassword) {
      throw new AppErrorResponse({
        statusCode: 403,
        name: "Unauthorized",
        message: "Contraseña incorrecta",
      });
    }

    const box = await BoxProductionModel.findOne({ code, active: true }).exec();

    if (!box) {
      throw new AppErrorResponse({
        statusCode: 404,
        name: "NotFound",
        message: "No se encontró el código",
      });
    }

    // 🔹 Actualiza solo el `status` sin afectar otros campos
    await BoxProductionModel.updateOne({ _id: box._id }, { $set: { status: 99 } }).exec();

    return {
      success: true,
      message: `El código ${code} ha sido marcado como inválido (status = 99).`,
    };
  }
}

const boxProductionService: BoxProductionService = new BoxProductionService();
export default boxProductionService;
