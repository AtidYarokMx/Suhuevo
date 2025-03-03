/* librerías externas */
import { type ClientSession } from 'mongoose'

/* modelos */
import { ShedModel } from '@app/repositories/mongoose/models/shed.model'
import { ShedHistoryModel } from '@app/repositories/mongoose/history/shed.history-model'

/* utilidades */
import { customLog } from '@app/utils/util.util'

/* dtos e interfaces */
import { createShedBody, initializeShedBody, IShed, ShedStatus } from '@app/dtos/shed.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'
import { Types } from '@app/repositories/mongoose'
import { DailyRecordModel } from '@app/repositories/mongoose/models/dailyRecord.model'
import { WeeklyRecordModel } from '@app/repositories/mongoose/models/weeklyRecord.model'
import { getAdminWeekRange } from '@app/utils/date.util'
import { BoxProductionModel } from '@app/repositories/mongoose/models/box-production.model'
import { updateFarm } from '@app/dtos/farm.dto'


/**
 * 📌 Servicio para la gestión de casetas (Sheds)
 */
class ShedService {



  /**
   * 🐣 Calcula la edad en semanas de la parvada según la fecha de nacimiento
   */
  private calculateFlockAgeWeeks(birthDate: Date): number {
    const now = new Date();
    return Math.floor((now.getTime() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  }

  /**
   * 📌 Obtiene el siguiente número de caseta disponible en una granja
   */
  private async getNextShedNumber(farmId: string, session: ClientSession): Promise<number> {
    customLog(`📌 Buscando el último número de caseta para la granja ${farmId}...`);

    const lastShed = await ShedModel.findOne({ farm: farmId }, { shedNumber: 1 })
      .sort({ shedNumber: -1 })
      .session(session)
      .exec();

    return lastShed ? (lastShed.shedNumber ?? 0) + 1 : 1;
  }

  /**
   * Crea una nueva caseta dentro de una granja con `shedNumber` único
   */
  async create(body: createShedBody, session: ClientSession, locals: AppLocals) {
    customLog("🚀 Creando nueva caseta...");

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

      const shed = new ShedModel({
        ...body,
        shedNumber,
        createdBy: user,
        lastUpdateBy: user,
        initialHensCount: 0,
        avgHensWeight: 0,
        generationId: "0",
        status: ShedStatus.INACTIVE,
      });

      const saved = await shed.save({ validateBeforeSave: true, session });

      customLog("✅ [Service] Caseta creada exitosamente:", saved);
      return saved.toJSON();
    } catch (error) {
      throw error;
    }
  }

  async initializeShed(
    _id: string,
    body: initializeShedBody,
    session: ClientSession,
    locals: AppLocals
  ) {
    customLog(`🚀 Inicializando caseta ${_id}...`);
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

      // Calculamos la edad de la parvada en semanas
      const ageWeeks = this.calculateFlockAgeWeeks(new Date(body.birthDate));

      // Generar un ID único para la parvada
      const generationId = new Date().toISOString().split("T")[0].replace(/-/g, "");

      // Actualizar la caseta con los datos de inicialización
      shed.set({
        initialHensCount: body.initialHensCount,
        birthDate: new Date(body.birthDate),
        ageWeeks,
        avgHensWeight: body.avgHensWeight,
        generationId,
        status: ShedStatus.PRODUCTION,
        lastUpdateBy: user,
      });
      customLog(`🚀 Inicializando caseta ${_id} con ${body}`);

      const updated = await shed.save({ validateBeforeSave: true, session });
      return updated;
    } catch (error) {
      throw error;
    }
  }


  /**
   * 🔄 Cambia el estado de una caseta asegurando el flujo correcto.
   */
  async changeShedStatus(_id: string, newStatus: ShedStatus, session: ClientSession, locals: AppLocals) {
    customLog(`🔄 Cambiando estado de caseta ${_id} a ${newStatus}...`);

    const user = locals.user._id;
    const shed = await ShedModel.findById(_id).session(session);
    if (!shed) throw new AppErrorResponse({ name: "ShedNotFound", statusCode: 404, message: "Caseta no encontrada." });

    const validTransitions = {
      [ShedStatus.INACTIVE]: [ShedStatus.CLEANING],
      [ShedStatus.CLEANING]: [ShedStatus.READY_TO_PRODUCTION],
      [ShedStatus.READY_TO_PRODUCTION]: [ShedStatus.PRODUCTION],
      [ShedStatus.PRODUCTION]: [ShedStatus.INACTIVE],
    };

    if (!validTransitions[shed.status]?.includes(newStatus)) {
      throw new AppErrorResponse({ name: "InvalidStatusChange", statusCode: 400, message: `No se puede cambiar a '${newStatus}'.` });
    }

    if (shed.status === ShedStatus.PRODUCTION && newStatus === ShedStatus.INACTIVE) {
      customLog("🚀 Finalizando producción y guardando resumen...");

      const weeklySummary = await this.getTotalSummary(_id);
      await ShedHistoryModel.create([{ shedId: shed._id, generationId: shed.generationId, change: { status: newStatus, summary: weeklySummary }, updatedBy: user }], { session });

      shed.set({ initialHensCount: 0, ageWeeks: 0, status: ShedStatus.INACTIVE, generationId: "0", lastUpdateBy: user });
    } else {
      shed.status = newStatus;
      shed.lastUpdateBy = user;
    }

    const updated = await shed.save({ validateBeforeSave: true, session });
    customLog(`✅ Estado de caseta ${_id} cambiado a ${newStatus}`);
    return updated;
  }

  /**
   * 📊 Captura datos diarios de producción
   */
  async captureDailyData(
    shedId: string,
    dailyData: {
      captureDate: string;
      foodConsumedKg: number;
      mortality: number;
      avgHensWeight: number;
      uniformity: number;
    },
    session: ClientSession,
    locals: AppLocals
  ) {
    const user = locals.user._id;
    const { weekStart, weekEnd } = getAdminWeekRange();
    const captureDay = new Date(dailyData.captureDate);

    customLog(`📆 Fecha de captura: ${captureDay.toISOString()}`);
    customLog(`🗓️ Semana administrativa: ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);


    if (captureDay < weekStart || captureDay > weekEnd) {
      throw new AppErrorResponse({ statusCode: 400, name: "InvalidCaptureDate", message: "Fecha fuera de la semana administrativa." });
    }

    // 🔹 Obtener datos de la caseta
    const shed = await ShedModel.findById(shedId).session(session).exec();
    if (!shed) {
      throw new AppErrorResponse({
        statusCode: 404,
        name: "ShedNotFound",
        message: "Caseta no encontrada."
      });
    }

    customLog(`🏠 Caseta encontrada: ${shed.name} - Initial Hens Count: ${shed.initialHensCount}`);

    // 🔹 Sumar toda la mortalidad acumulada antes de captureDate
    const previousMortality = await DailyRecordModel.aggregate([
      { $match: { shedId: new Types.ObjectId(shedId), date: { $lt: captureDay } } },
      { $group: { _id: null, totalMortality: { $sum: "$mortality" } } }
    ])
      .session(session)
      .exec();

    const totalPreviousMortality = previousMortality.length ? previousMortality[0].totalMortality : 0;
    customLog(`☠️ Mortalidad previa acumulada: ${totalPreviousMortality}`);

    // 🔹 Cálculo de gallinas vivas
    const hensAlive = Math.max(shed.initialHensCount - totalPreviousMortality - dailyData.mortality, 0);
    customLog(`🐔 Gallinas vivas después de mortalidad actual: ${hensAlive}`);

    // 🔍 Depuración: Verifica que shedId es un ObjectId válido
    const shedObjectId = new Types.ObjectId(shedId);
    customLog(`🔍 Buscando códigos en box-production con shedId: ${shedObjectId} y fecha: ${captureDay}`);

    // 🔹 Consultar producción de cajas del día en `box-production`
    const boxProductionRecords = await BoxProductionModel.find({
      shed: shedObjectId, // ✅ Usar el campo correcto "shed"
      createdAt: {
        $gte: new Date(captureDay.setUTCHours(0, 0, 0, 0)), // Desde el inicio del día
        $lt: new Date(captureDay.setUTCHours(23, 59, 59, 999)) // Hasta el final del día
      },
      status: { $ne: 99 } // Filtrar códigos con estado diferente a 99
    })
      .select("totalEggs netWeight")
      .session(session)
      .lean();

    customLog(`📦 Registros de producción encontrados: ${boxProductionRecords.length}`);

    // 🔹 Calcular producción de huevos y cajas
    const producedBoxes = boxProductionRecords.length;
    const totalProducedEggs = boxProductionRecords.reduce((sum, record) => sum + record.totalEggs.valueOf(), 0);
    const totalNetWeight = boxProductionRecords.reduce((sum, record) => sum + record.netWeight, 0);


    customLog(`🥚 Total huevos producidos: ${totalProducedEggs}`);
    customLog(`📦 Total cajas producidas: ${producedBoxes}`);
    customLog(`⚖️ Peso neto total de huevos: ${totalNetWeight}`);

    // 🔹 Calcular peso promedio del huevo
    const avgEggWeight = totalProducedEggs > 0 ? totalNetWeight / totalProducedEggs : 0;
    customLog(`📊 Peso promedio del huevo: ${avgEggWeight.toFixed(2)}`);

    let record = await DailyRecordModel.findOne({ shedId, date: captureDay }).session(session).exec();

    if (record) {
      customLog(`✏️ Actualizando registro diario existente.`);
      record.set({
        ...dailyData,
        producedEgss: totalProducedEggs,
        producedBoxes: producedBoxes,
        avgEggWeight,
        totalNetWeight,
        hensAlive: hensAlive,
        updateBy: user
      })
      await record.save({ validateBeforeSave: true, session });
    } else {
      customLog(`🆕 Creando nuevo registro diario.`);
      record = new DailyRecordModel({
        shedId,
        generationId: shed.generationId,
        date: captureDay,
        ...dailyData,
        producedEggs: totalProducedEggs,
        producedBoxes: producedBoxes,
        avgEggWeight,
        totalNetWeight,
        hensAlive: hensAlive,
        createdBy: user,
        updatedBy: user,
      });
      await record.save({ validateBeforeSave: true, session });
    }

    // 📌 **ACTUALIZAR O CREAR WeeklyRecord**
    let weeklyRecord = await WeeklyRecordModel.findOne({
      shedId: shedId,
      weekStart: weekStart,
      generationId: shed.generationId
    }).session(session).exec();

    if (!weeklyRecord) {
      customLog(`🆕 Creando nuevo registro semanal.`);
      // 🆕 Si no existe un registro semanal, crearlo con los datos actuales
      weeklyRecord = new WeeklyRecordModel({
        shedId,
        weekStart: weekStart,
        weekEnd: weekEnd,
        totalHensAlive: hensAlive,
        totalFoodConsumedKg: dailyData.foodConsumedKg,
        totalProducedBoxes: producedBoxes,
        totalProducedEggs: totalProducedEggs,
        totalMortality: dailyData.mortality,
        totalNetWeight,
        avgEggWeight,
        avgHensWeight: dailyData.avgHensWeight,
        generationId: shed.generationId
      });
    } else {
      // 🔄 **Actualizar el WeeklyRecord sumando los datos diarios**
      customLog(`🔄 Actualizando registro semanal.`);
      weeklyRecord.totalHensAlive = hensAlive;
      weeklyRecord.totalFoodConsumedKg += dailyData.foodConsumedKg;
      weeklyRecord.totalProducedBoxes += producedBoxes;
      weeklyRecord.totalProducedEggs += totalProducedEggs;
      weeklyRecord.totalMortality += dailyData.mortality;
      weeklyRecord.totalNetWeight = totalNetWeight;
      weeklyRecord.avgEggWeight = avgEggWeight;
      weeklyRecord.avgHensWeight = dailyData.avgHensWeight;
    }

    await weeklyRecord.save({ validateBeforeSave: true, session });

    customLog(`✅ Captura de datos diaria finalizada.`);
    return record;
  }

  /**
   * 📊 Obtiene el historial de todas las generaciones de una caseta
   */
  async getShedHistory(shedId: string) {
    return await WeeklyRecordModel.find({ shedId }).sort({ weekStart: 1 }).exec();
  }

  /**
   * 📊 Obtiene los datos de una generación específica
   */
  async getGenerationData(shedId: string, generationId: string) {
    return await WeeklyRecordModel.find({ shedId, generationId }).sort({ weekStart: 1 }).exec();
  }

  /**
   * 📊 Obtiene el resumen de la semana actual
   */
  async getWeeklySummary(shedId: string) {
    const { weekStart, weekEnd } = getAdminWeekRange();

    const summary = await WeeklyRecordModel.aggregate([
      { $match: { shedId: new Types.ObjectId(shedId), weekStart, weekEnd } },
      {
        $group: {
          _id: "$shedId",
          totalFoodConsumedKg: { $sum: "$totalFoodConsumedKg" },
          totalProducedEggs: { $sum: "$totalProducedEggs" },
          totalProducedBoxes: { $sum: "$totalProducedBoxes" },
          totalMortality: { $sum: "$totalMortality" },
          boxesByType: { $push: "$boxesByType" },
        }
      }
    ]).exec();

    return summary[0] || {};
  }

  /**
   * 📊 Obtiene el historial de todas las semanas de una parvada en producción
   */
  async getProductionHistory(shedId: string) {
    return await WeeklyRecordModel.find({ shedId }).sort({ weekStart: 1 }).exec();
  }

  /**
   * 📅 Obtiene un listado de todas las semanas registradas para una caseta
   */
  async getWeeksList(shedId: string) {
    return await WeeklyRecordModel.find({ shedId }).select("weekStart weekEnd").sort({ weekStart: 1 }).exec();
  }

  /**
   * 📅 Obtiene el detalle de una semana específica
   */
  async getWeekDetail(shedId: string, weekStart: string) {
    return await WeeklyRecordModel.findOne({ shedId, weekStart: new Date(weekStart) }).exec();
  }


  /**
   * 📊 Obtiene el resumen total desde el inicio de la generación actual hasta hoy, incluyendo cajas por tipo.
   */
  async getTotalSummary(shedId: string) {
    // Obtener la generación actual de la caseta
    const shed = await ShedModel.findById(shedId).select("generationId").lean();
    if (!shed) throw new AppErrorResponse({ statusCode: 404, name: "ShedNotFound", message: "Caseta no encontrada." });

    const { generationId } = shed;

    const summary = await WeeklyRecordModel.aggregate([
      {
        $match: {
          shedId: new Types.ObjectId(shedId),
          generationId // Filtrar solo los registros de la generación actual
        }
      },
      {
        $group: {
          _id: "$generationId",
          totalFoodConsumedKg: { $sum: "$totalFoodConsumedKg" },
          totalProducedEggs: { $sum: "$totalProducedEggs" },
          totalProducedBoxes: { $sum: "$totalProducedBoxes" },
          totalMortality: { $sum: "$totalMortality" },
          boxesByType: { $push: "$boxesByType" }, // Agregamos las cajas por tipo
        }
      }
    ]).exec();

    return summary[0] || {};
  }

  /**
   * 📦 Obtiene datos de cajas producidas en semanas anteriores para gráficos
   */
  async getProductionTrends(shedId: string) {
    return await WeeklyRecordModel.aggregate([
      { $match: { shedId: new Types.ObjectId(shedId) } },
      {
        $group: {
          _id: "$weekStart",
          boxesByType: { $push: { type: "$boxType", count: "$boxCount" } },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();
  }

  /**
   * Obtiene una caseta activa por su identificador, junto con un resumen actual basado en los registros diarios.
   */
  async getOne(_id: string) {
    try {
      customLog(`Iniciando búsqueda de caseta con id: ${_id}`);

      // Obtener datos básicos de la caseta y su generación actual
      const shed = await ShedModel.findById(_id)
        .populate({ path: "farm", select: "name" }) // Obtener nombre de la granja
        .lean();

      if (!shed) {
        throw new AppErrorResponse({
          name: "ShedNotFound",
          statusCode: 404,
          message: "No se encontró la caseta solicitada",
        });
      }

      const farmData = (shed.farm && typeof shed.farm === 'object' && 'name' in shed.farm)
        ? { id: shed.farm._id, name: shed.farm.name }
        : { id: shed.farm as Types.ObjectId, name: "Nombre no disponible" };


      // Obtener el resumen de la semana actual desde WeeklyRecord
      const summaryData = await WeeklyRecordModel.findOne(
        { shedId: _id, generationId: shed.generationId },
        {
          totalHensAlive: 1,
          totalFoodConsumedKg: 1,
          totalProducedEggs: 1,
          totalProducedBoxes: 1,
          totalMortality: 1,
          avgHensWeight: 1,
          avgEggWeight: 1,
          boxesByType: 1,
          weekStart: 1,
          weekEnd: 1
        }
      )
        .sort({ weekStart: -1 }) // Obtener el registro más reciente
        .lean();

      // Valores predeterminados si no hay datos de resumen
      const summary = summaryData || {
        totalHensAlive: 0,
        totalFoodConsumedKg: 0,
        totalProducedEggs: 0,
        totalProducedBoxes: 0,
        totalMortality: 0,
        avgEggWeight: 0,
        avgHensWeight: 0,
        boxesByType: [],
        weekStart: "",
        weekEnd: ""
      };

      // Obtener datos históricos de producción por semana
      const chartsData = await WeeklyRecordModel.find(
        { shedId: _id, generationId: shed.generationId },
        {
          weekStart: 1,
          totalFoodConsumedKg: 1,
          totalHensAlive: 1,
          totalProducedEggs: 1,
          totalProducedBoxes: 1
        }
      )
        .sort({ weekStart: 1 }) // Orden cronológico ascendente
        .lean()
        .then((records) => records.map((record) => ({
          week: record.weekStart.toISOString().split("T")[0], // Convertir a formato de fecha
          foodConsumedKG: record.totalFoodConsumedKg,
          hensAlive: record.totalHensAlive,
          producedEggs: record.totalProducedEggs,
          producedBoxes: record.totalProducedBoxes
        })));

      // Construcción del objeto de respuesta con los datos completos
      const response = {
        _id: shed._id,
        name: shed.name,
        description: shed.description,
        farm: farmData,
        status: shed.status,
        week: shed.week,
        ageWeeks: shed.ageWeeks,
        weekStart: summary.weekStart,
        weekEnd: summary.weekEnd,
        generationId: shed.generationId,
        summary,
        chartsData
      };

      customLog(`✅ Caseta encontrada correctamente con id: ${_id}`);
      return response;
    } catch (error: any) {
      customLog(`❌ Error al obtener la caseta con id ${_id}: ${error.message}`);
      throw error;
    }

  }




  /**
   * Obtiene todas las casetas activas, junto con sus resúmenes actuales.
   */
  async getAll() {
    try {
      customLog(`Iniciando consulta de todas las casetas activas`);
      const result = await ShedModel.aggregate([
        { $match: { active: true } },
        {
          $lookup: {
            from: "dailyrecords",
            localField: "_id",
            foreignField: "shedId",
            as: "dailyRecords"
          }
        },
        {
          $group: {
            _id: "$_id",
            initialHensCount: { $first: "$initialHensCount" },
            name: { $first: "$name" },
            status: { $first: "$status" },
            totalFoodConsumedKg: { $sum: { $ifNull: ["$dailyRecords.foodConsumedKg", 0] } },
            totalWaterConsumedL: { $sum: { $ifNull: ["$dailyRecords.waterConsumedL", 0] } },
            totalProducedEggs: { $sum: { $ifNull: ["$dailyRecords.producedEggs", 0] } },
            totalProducedBoxes: { $sum: { $ifNull: ["$dailyRecords.producedBoxes", 0] } },
            totalMortality: { $sum: { $ifNull: ["$dailyRecords.mortality", 0] } }
          }
        },
        {
          $addFields: {
            summary: {
              totalFoodConsumedKg: "$totalFoodConsumedKg",
              totalWaterConsumedL: "$totalWaterConsumedL",
              totalProducedEggs: "$totalProducedEggs",
              totalProducedBoxes: "$totalProducedBoxes",
              totalMortality: "$totalMortality"
            }
          }
        }
      ]).exec();
      customLog(`Se han obtenido ${result.length} casetas activas`);
      return result;
    } catch (error: any) {
      customLog(`Error al obtener casetas: ${error.message}`);
      throw new AppErrorResponse({
        name: "ShedQueryError",
        statusCode: 500,
        message: error.message,
      });
    }
  }

}

const shedService: ShedService = new ShedService()
export default shedService
