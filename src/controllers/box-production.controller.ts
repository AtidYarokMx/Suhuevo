/* lib */
import { z } from 'zod'
/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import boxProductionService from '@services/box-production.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* param validations */
import { validateBarcode } from '@app/utils/validate.util'
/* dtos */
import { sendBoxesToSellsBody } from '@app/dtos/box-production.dto'
import { AppLocals } from '@app/interfaces/auth.dto'
import { customLog } from '@app/utils/util.util'

/**
 * @swagger
 * tags:
 *   name: BoxProduction
 *   description: API para la gestión de cajas de producción
 */
class BoxProductionController {

  /**
   * @swagger
   * /api/boxes/{code}:
   *   get:
   *     summary: Obtiene una caja de producción por su código único
   *     description: Devuelve la información de una caja de producción basada en su código
   *     tags: [BoxProduction]
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Código único de la caja de producción
   *     responses:
   *       200:
   *         description: Caja encontrada
   *       400:
   *         description: Código no válido
   *       404:
   *         description: Caja no encontrada
   */
  public async getOne(req: Request, res: Response) {
    const code = req.params.code
    try {
      const validatedCode = validateBarcode(code)
      const response = await boxProductionService.getOne(validatedCode)
      return res.status(200).json(response)
    } catch (error) {
      customLog(`❌ Error en getOne: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * @swagger
   * /api/boxes/summary:
   *   get:
   *     summary: Obtiene un resumen de producción
   *     description: Devuelve el resumen de producción con la opción de filtrar por Shed, fechas y tipo.
   *     tags: [BoxProduction]
   *     parameters:
   *       - in: query
   *         name: shedId
   *         schema:
   *           type: string
   *         description: ID del Shed en MongoDB (opcional).
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio en formato YYYY-MM-DD (opcional).
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin en formato YYYY-MM-DD (opcional).
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Tipo de caja (enviar "all" para incluir todos los tipos con 0 valores).
   *     responses:
   *       200:
   *         description: Resumen de producción.
   */
  public async getSummary(req: Request, res: Response) {
    try {
      const { shedId, startDate, endDate, type } = req.query;
      const response = await boxProductionService.getSummary(
        shedId ? String(shedId) : undefined,
        startDate ? String(startDate) : undefined,
        endDate ? String(endDate) : undefined,
        type ? String(type) : undefined
      );
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ Error en getSummary: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }


  /**
   * @swagger
   * /api/boxes:
   *   get:
   *     summary: Obtiene todas las cajas activas
   *     description: Retorna todas las cajas de producción activas y su resumen opcionalmente.
   *     tags: [BoxProduction]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *         description: Límite de registros a devolver (por defecto 1000000).
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio (YYYY-MM-DD).
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin (YYYY-MM-DD).
   *       - in: query
   *         name: status
   *         schema:
   *           type: number
   *         description: Estado de las cajas.
   *       - in: query
   *         name: includeStatus99
   *         schema:
   *           type: boolean
   *         description: Si es `true`, incluye cajas con status 99.
   *       - in: query
   *         name: farm
   *         schema:
   *           type: string
   *         description: Filtrar por ID de granja.
   *       - in: query
   *         name: shed
   *         schema:
   *           type: string
   *         description: Filtrar por ID de caseta.
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Filtrar por ID de tipo de caja.
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filtrar por ID de categoría de caja.
   *     responses:
   *       200:
   *         description: Lista de cajas activas.
   */
  public async getAll(req: Request, res: Response) {
    try {
      customLog(`➡️  GET /api/boxes - Iniciando...`);

      const limit = req.query.limit ? Math.max(Number(req.query.limit), 1) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const status = req.query.status ? Number(req.query.status) : undefined;
      const includeStatus99 = req.query.includeStatus99 === "true";
      const farm = req.query.farm ? String(req.query.farm) : undefined;
      const shed = req.query.shed ? String(req.query.shed) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;

      // 🔹 LOG: Mostrar los filtros recibidos
      customLog(`🔍 Parámetros recibidos: ${JSON.stringify(req.query, null, 2)}`);

      const response = await boxProductionService.getAll(
        limit,
        startDate,
        endDate,
        status,
        includeStatus99,
        farm,
        shed,
        type,
        category
      );

      customLog(`✅ GET /api/boxes - Finalizado con éxito.`);
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ Error en getAll: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }


  /**
   * @swagger
   * /api/boxes/shed/{shedId}:
   *   get:
   *     summary: Obtiene todas las cajas de producción asignadas a un Shed
   *     description: Devuelve la lista de códigos de producción para un Shed específico
   *     tags: [BoxProduction]
   *     parameters:
   *       - in: path
   *         name: shedId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del Shed en MongoDB
   *     responses:
   *       200:
   *         description: Lista de códigos de producción asignados al Shed
   *       400:
   *         description: ID del Shed no válido
   *       404:
   *         description: No se encontraron códigos para el Shed
   */
  public async getByShedId(req: Request, res: Response) {
    const { shedId } = req.params;
    const { startDate, endDate, type, category, summary } = req.query;

    try {
      const response = await boxProductionService.getByShedId(
        shedId,
        startDate ? String(startDate) : undefined,
        endDate ? String(endDate) : undefined,
        type ? String(type) : undefined,
        category ? String(category) : undefined,
        summary === "true"
      );

      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ Error en getByShedId: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }



  /**
   * @swagger
   * /api/boxes/summary:
   *   get:
   *     summary: Obtiene un resumen de tipos de huevo
   *     description: Devuelve un resumen de las cajas registradas, agrupadas por tipo de huevo.
   *     tags: [BoxProduction]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin (YYYY-MM-DD)
   *       - in: query
   *         name: farmNumber
   *         schema:
   *           type: number
   *         description: Número de la granja
   *       - in: query
   *         name: shedNumber
   *         schema:
   *           type: number
   *         description: Número del galpón
   *       - in: query
   *         name: status
   *         schema:
   *           type: number
   *         description: Estado de las cajas
   *     responses:
   *       200:
   *         description: Resumen de tipos de huevo
   */
  public async getEggTypeSummaryFromBoxes(req: Request, res: Response) {
    customLog("Query Params:", req.query);
    try {
      // Extrae filtros con validación
      const filters = {
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        farmNumber: req.query.farmNumber ? Number(req.query.farmNumber) : undefined,
        shedNumber: req.query.shedNumber ? Number(req.query.shedNumber) : undefined,
        status: req.query.status ? Number(req.query.status) : undefined,
      };

      const summary = await boxProductionService.getEggTypeSummaryFromBoxes(filters);
      return res.status(200).json({ data: summary });
    } catch (error) {
      customLog(`❌ Error en getEggTypeSummaryFromBoxes: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * @swagger
   * /api/boxes/sells:
   *   post:
   *     summary: Envía cajas a ventas
   *     description: Actualiza el estado de las cajas y genera un registro de envío.
   *     tags: [BoxProduction]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/sendBoxesToSellsBody'
   *     responses:
   *       200:
   *         description: Cajas enviadas exitosamente
   */
  public async sendBoxesToSells(req: Request, res: Response) {
    const body = req.body as z.infer<typeof sendBoxesToSellsBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()

    try {
      session.startTransaction();
      const validatedBody = sendBoxesToSellsBody.parse(body)
      const response = await boxProductionService.sendBoxesToSells(validatedBody, session, locals)
      await session.commitTransaction();
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction();
      customLog(`❌ Error en sendBoxesToSells: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  /**
   * @swagger
   * /api/boxes/sync:
   *   post:
   *     summary: Sincroniza datos desde SQL a MongoDB
   *     description: Importa y actualiza los códigos de producción en MongoDB desde SQL Server.
   *     tags: [BoxProduction]
   *     responses:
   *       200:
   *         description: Sincronización completada exitosamente
   */
  public async synchronize(req: Request, res: Response) {
    try {
      customLog("📌 Iniciando sincronización de códigos...");
      const response = await boxProductionService.synchronize();
      customLog("✅ Sincronización completada.");
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ Error en synchronize: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async markBoxAsInvalid(req: Request, res: Response) {
    try {
      const { code, password } = req.body;

      if (!code || !password) {
        return res.status(400).json({ success: false, message: "Código y contraseña son requeridos" });
      }

      const response = await boxProductionService.markBoxAsInvalid(code, password);

      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ Error en markBoxAsInvalid: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

}

export const boxProductionController: BoxProductionController = new BoxProductionController()
