import { ShipmentModel } from "@app/repositories/mongoose/schemas/shipment.schema";

import { ShipmentHistoryModel } from "@app/repositories/mongoose/history/shipment.history-model";
import { ShipmentCounterModel } from "@app/repositories/mongoose/counters/shipment.counter";
import { BoxProductionModel } from "@app/repositories/mongoose/models/box-production.model";
import { CatalogBoxModel } from "@app/repositories/mongoose/catalogs/box.catalog";

import mongoose, { ClientSession } from "mongoose";
import { customLog } from "@app/utils/util.util";

export class ShipmentService {
  static async createShipment({ codes, plates, driver, userId }: any, session: ClientSession) {
    const currentDate = new Date();
    const dateString = currentDate.toISOString().split("T")[0].replace(/-/g, "");

    // Contador para generar shipmentId único
    const counter = await ShipmentCounterModel.findOneAndUpdate(
      { id: "shipmentId" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const count = (counter as any)?.value ?? 1;
    const shipmentId = `ENV-${dateString}-${count.toString().padStart(4, "0")}`;

    // Obtener todos los códigos sin filtrar por estado
    const allBoxRecords = await BoxProductionModel.find(
      { active: true, code: { $in: codes } },
      { _id: true, code: true, netWeight: true, totalEggs: true, type: true, status: true }
    )
      .session(session)
      .exec();

    // Filtrar códigos inválidos
    const invalidCodes = allBoxRecords.filter((box) => box.status !== 1).map((box) => box.code.toString());
    const validBoxes = allBoxRecords.filter((box) => box.status === 1);

    if (validBoxes.length === 0) {
      return { message: "No hay códigos válidos para enviar.", invalidCodes };
    }

    // Buscar nombres de categoría
    const typeIds = [...new Set(validBoxes.map((b) => b.type.toString()))];
    const categories = await CatalogBoxModel.find({ _id: { $in: typeIds } })
      .select("name")
      .lean();
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    // Agrupar por caseta (shed)
    const groupedCodes = validBoxes.reduce((acc, box) => {
      const shedId = box.shed?.toString() || "Desconocido";
      if (!acc[shedId]) acc[shedId] = [];
      acc[shedId].push(box.code);
      return acc;
    }, {} as Record<string, string[]>);

    // ✅ Actualizar estado de los códigos en su propio documento
    await BoxProductionModel.updateMany(
      { code: { $in: validBoxes.map((b) => b.code) }, status: 1 },
      { status: 2 },
      { session }
    );

    // Generar resumen
    const summary = validBoxes.reduce(
      (acc, box) => {
        const category = categoryMap.get(box.type.toString()) || "Sin Categoría";
        if (!acc.totalByCategory[category]) {
          acc.totalByCategory[category] = { count: 0, totalNetWeight: 0, totalEggs: 0 };
        }
        acc.totalByCategory[category].count++;
        acc.totalByCategory[category].totalNetWeight += box.netWeight || 0;
        acc.totalByCategory[category].totalEggs += Number(box.totalEggs) || 0;
        acc.totalNetWeight += box.netWeight || 0;
        acc.totalEggs += Number(box.totalEggs) || 0;
        return acc;
      },
      {
        totalBoxes: validBoxes.length,
        totalNetWeight: 0,
        totalEggs: 0,
        totalByCategory: {} as Record<string, { count: number; totalNetWeight: number; totalEggs: number }>,
      }
    );

    // Crear documento de envío
    const shipment = new ShipmentModel({
      shipmentId,
      description: "Envío de Producción a Ventas",
      codes: validBoxes.map((box) => ({
        codeId: box._id,
        code: box.code,
      })),
      groupedCodes,
      vehiclePlates: plates,
      driver,
      createdBy: new mongoose.Types.ObjectId(userId),
      lastUpdateBy: new mongoose.Types.ObjectId(userId),
      shipmentDate: currentDate,
      status: 1,
      summary,
    });

    await shipment.save({ session });
    await ShipmentHistoryModel.create({
      updatedBy: new mongoose.Types.ObjectId(userId),
      change: shipment.toObject(),
    });

    return {
      shipment: shipment.toObject(),
      invalidCodes: invalidCodes.length > 0 ? invalidCodes : null,
    };
  }

  static async getAllShipments() {
    const data = await ShipmentModel.find({ active: true })
      .populate({
        path: "createdBy",
        model: "User",
        justOne: true,
        transform: (doc, id) => (doc == null ? null : [doc.name, doc.lastName, doc.secondLastName].join(" ")),
      })
      .populate({
        path: "codes.codeId",
        select: "status",
        model: "box-production",
        justOne: true,
      })
      .exec();

    return data;
  }

  static async getShipmentDetails(shipmentId: string) {
    const shipment = await ShipmentModel.findOne({ shipmentId })
      .populate({
        path: "createdBy",
        model: "User",
        justOne: true,
        transform: (doc, id) => (doc == null ? null : [doc.name, doc.lastName, doc.secondLastName].join(" ")),
      })
      .populate({
        path: "codes.codeId", // ✅ Cambio aquí
        select: "code netWeight status type farm shed farmNumber shedNumber",
        populate: [
          { path: "type", select: "name" },
          { path: "farm", select: "name" },
          { path: "shed", select: "name" },
        ],
      })
      .lean();

    if (!shipment) throw new Error("Envío no encontrado.");

    const codesWithDetails = shipment.codes.map((item: any) => {
      const box = item.codeId; // ✅ Cambio aquí

      return {
        code: item.code, // ✅ El string real del código
        status: box?.status || 0,
        netWeight: box?.netWeight || 0,
        category: box?.type?.name || "Sin Categoría",
        farmName: box?.farm?.name || "Sin Granja",
        shedName: box?.shed?.name || "Sin Caseta",
      };
    });

    return {
      ...shipment,
      codes: codesWithDetails,
    };
  }

  static async updateShipmentStatus({ shipmentId, codes, userId }: any, session: ClientSession) {
    const shipment = await ShipmentModel.findOne({ shipmentId }).session(session);
    if (!shipment) throw new Error("Envío no encontrado.");

    // Buscar todos los códigos reales (strings) y sus IDs
    const boxRecords = await BoxProductionModel.find({ code: { $in: codes } })
      .select("_id code status")
      .lean();

    if (boxRecords.length === 0) {
      return { message: "No se encontraron códigos válidos." };
    }

    const codeToIdMap = new Map(boxRecords.map((box) => [box.code, box._id.toString()]));
    const idToStatusMap = new Map(boxRecords.map((box) => [box._id.toString(), box.status]));

    const notFoundCodes = codes.filter((code: string) => !codeToIdMap.has(code));
    const alreadyReceivedCodes: string[] = [];
    const validCodesToUpdate: string[] = [];

    const codeIdListInShipment = shipment.codes.map((c) => c.codeId.toString());

    for (const code of codes) {
      const id = codeToIdMap.get(code);
      if (!id || !codeIdListInShipment.includes(id)) continue;

      const currentStatus = idToStatusMap.get(id);
      if (currentStatus === 4) {
        alreadyReceivedCodes.push(code);
      } else if (currentStatus === 2) {
        validCodesToUpdate.push(code);
      }
    }

    if (validCodesToUpdate.length === 0 && alreadyReceivedCodes.length === 0) {
      return { message: "No se encontraron códigos válidos para actualizar.", notFoundCodes };
    }

    // 🔄 Actualizar los códigos válidos a estado recibido (4)
    await BoxProductionModel.updateMany({ code: { $in: validCodesToUpdate }, status: 2 }, { status: 4 }, { session });

    // Calcular nuevo estado del envío
    const boxIds = shipment.codes.map((c) => c.codeId.toString());
    const updatedBoxes = await BoxProductionModel.find({ _id: { $in: boxIds } }, "status").lean();
    const totalCodes = updatedBoxes.length;
    const receivedCount = updatedBoxes.filter((box) => box.status === 4).length;

    if (receivedCount === totalCodes) shipment.status = 3; // Completamente recibido
    else if (receivedCount > 0) shipment.status = 2; // Parcialmente recibido

    shipment.lastUpdateBy = new mongoose.Types.ObjectId(userId);
    await shipment.save({ session });

    await ShipmentHistoryModel.create({
      updatedBy: new mongoose.Types.ObjectId(userId),
      change: shipment.toObject(),
    });

    return {
      message: "Actualización realizada con éxito.",
      shipmentStatus: shipment.status,
      updatedCodes: validCodesToUpdate,
      alreadyReceivedCodes,
      notFoundCodes,
    };
  }
}
