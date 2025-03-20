import { ShipmentModel } from '@app/repositories/mongoose/schemas/shipment.schema';

import { ShipmentHistoryModel } from '@app/repositories/mongoose/history/shipment.history-model';
import { ShipmentCounterModel } from '@app/repositories/mongoose/counters/shipment.counter';
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model';
import { CatalogBoxModel } from '@app/repositories/mongoose/catalogs/box.catalog';

import mongoose, { ClientSession } from 'mongoose';
import { customLog } from '@app/utils/util.util';

export class ShipmentService {

  static async createShipment({ codes, plates, driver, userId }: any, session: ClientSession) {
    const currentDate = new Date();
    const dateString = currentDate.toISOString().split('T')[0].replace(/-/g, "");

    // Contador para generar shipmentId único
    const counter = await ShipmentCounterModel.findOneAndUpdate(
      { id: "shipmentId" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const count = (counter as any)?.value ?? 1;
    const shipmentId = `ENV-${dateString}-${count.toString().padStart(4, '0')}`;

    // Obtener todos los códigos sin filtrar por estado
    const allBoxRecords = await BoxProductionModel.find(
      { active: true, code: { $in: codes } },
      { _id: true, code: true, netWeight: true, totalEggs: true, type: true, status: true }
    )
      .session(session)
      .exec();

    // Filtrar códigos inválidos
    const invalidCodes = allBoxRecords.filter(box => box.status !== 1).map(box => box.code.toString());
    const validBoxRecords = allBoxRecords.filter(box => box.status === 1);

    if (validBoxRecords.length === 0) {
      return { message: "No hay códigos válidos para enviar.", invalidCodes };
    }

    // 🔍 Obtener todos los IDs únicos de categorías
    const typeIds = validBoxRecords.map(box => box.type.toString());
    const uniqueTypeIds = [...new Set(typeIds)];

    // 🔍 Hacer una consulta directa a CatalogBoxModel para obtener los nombres
    const categories = await CatalogBoxModel.find({ _id: { $in: uniqueTypeIds } }).select('name').lean();
    const categoryMap = new Map(categories.map(category => [category._id.toString(), category.name]));

    // Agrupar los códigos válidos por Caseta (shed)
    const groupedCodes = validBoxRecords.reduce((acc, box) => {
      const shedId = box.shed?.toString() || "Desconocido";
      if (!acc[shedId]) acc[shedId] = [];
      acc[shedId].push(box.code);
      return acc;
    }, {} as Record<string, string[]>);

    // Actualizar el estado de los códigos válidos
    await BoxProductionModel.updateMany(
      { code: { $in: validBoxRecords.map(box => box.code) }, status: 1 },
      { status: 2 },
      { session }
    );

    // Generar resumen general
    const totalNetWeight = validBoxRecords.reduce((sum, box) => sum + (box.netWeight || 0), 0);
    const totalEggs = validBoxRecords.reduce((sum, box) => sum + Number(box.totalEggs || 0), 0);

    // Generar el total por categoría adecuadamente
    const totalByCategory = validBoxRecords.reduce((acc, box) => {
      const typeId = box.type.toString();
      const categoryName = categoryMap.get(typeId) || "Sin Categoría";

      if (!acc[categoryName]) acc[categoryName] = { count: 0, totalNetWeight: 0, totalEggs: 0 };

      acc[categoryName].count++;
      acc[categoryName].totalNetWeight += box.netWeight || 0;
      acc[categoryName].totalEggs += Number(box.totalEggs) || 0;

      return acc;
    }, {} as Record<string, { count: number; totalNetWeight: number; totalEggs: number }>);

    // Crear nuevo envío
    const shipment = new ShipmentModel({
      shipmentId,
      description: "Envío de Producción a Ventas",
      codes: validBoxRecords.map((box) => ({ code: box._id, status: 2 })),
      groupedCodes,
      vehiclePlates: plates,
      driver,
      createdBy: new mongoose.Types.ObjectId(userId),
      lastUpdateBy: new mongoose.Types.ObjectId(userId),
      shipmentDate: currentDate,
      status: 1,
      summary: {
        totalBoxes: validBoxRecords.length,
        totalNetWeight,
        totalEggs,
        totalByCategory
      }
    });

    await shipment.save({ session });
    await ShipmentHistoryModel.create({
      updatedBy: new mongoose.Types.ObjectId(userId),
      change: shipment.toObject()
    });

    const result = JSON.parse(JSON.stringify(shipment));

    // Retornar respuesta con los códigos inválidos si existen
    return {
      shipment: result,
      invalidCodes: invalidCodes.length > 0 ? invalidCodes : null
    };
  }




  static async getAllShipments() {
    return ShipmentModel.find({}).exec();
  }


  static async updateShipmentStatus({ shipmentId, codes, userId }: any, session: ClientSession) {
    const shipment = await ShipmentModel.findOne({ shipmentId }).session(session);
    if (!shipment) throw new Error('Envío no encontrado.');

    // 🔍 Buscar los códigos en la base de datos para obtener sus `_id`
    const boxRecords = await BoxProductionModel.find({ code: { $in: codes } })
      .select('_id code status')
      .lean();

    if (boxRecords.length === 0) {
      return { message: "No se encontraron códigos válidos." };
    }

    // Mapear ObjectId a su código para facilitar la comparación
    const codeIdMap = new Map(boxRecords.map(box => [box.code, box._id.toString()]));
    const foundIds = new Set(codeIdMap.values());

    // Clasificar códigos
    const notFoundCodes = codes.filter((code: string) => !codeIdMap.has(code));
    const alreadyReceivedCodes: string[] = [];
    const validCodesToUpdate: string[] = [];

    shipment.codes.forEach((box) => {
      const boxId = box.code.toString();

      if (!foundIds.has(boxId)) return; // Ignorar códigos que no están en el envío

      if (box.status === 4) {
        alreadyReceivedCodes.push(boxId); // Códigos que ya fueron recibidos
      } else if (box.status === 2) {
        validCodesToUpdate.push(boxId); // Códigos válidos para actualizar
      }
    });

    if (validCodesToUpdate.length === 0 && alreadyReceivedCodes.length === 0) {
      return { message: "No se encontraron códigos válidos para actualizar.", notFoundCodes };
    }

    // 🔄 Actualizar los códigos que están listos para ser recibidos
    shipment.codes = shipment.codes.map((box) => {
      if (validCodesToUpdate.includes(box.code.toString())) {
        box.status = 4;  // Cambiar a estado Recibido
      }
      return box;
    });

    // 🔄 Actualizar el estado general del envío
    shipment.lastUpdateBy = new mongoose.Types.ObjectId(userId);
    const totalCodes = shipment.codes.length;
    const receivedCodesCount = shipment.codes.filter(c => c.status === 4).length;

    if (receivedCodesCount === totalCodes) shipment.status = 3;  // Completamente Recibido
    else if (receivedCodesCount > 0) shipment.status = 2;        // Parcialmente Recibido

    await shipment.save({ session });

    // 🔄 Guardar la actualización en el historial
    await ShipmentHistoryModel.create({
      updatedBy: new mongoose.Types.ObjectId(userId),
      change: shipment.toObject()
    });

    return {
      message: "Actualización realizada con éxito.",
      shipmentStatus: shipment.status,
      updatedCodes: validCodesToUpdate,
      alreadyReceivedCodes,
      notFoundCodes
    };
  }


}
