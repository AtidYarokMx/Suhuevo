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
 * 📦 Controlador para la gestión de cajas de producción.
 */
class BoxProductionController {

  /**
   * 🔍 Obtiene una caja de producción por su código único.
   * @route GET /api/boxes/:code
   * @param req - Express request
   * @param res - Express response
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
  * 📢 Obtiene todas las cajas de producción activas.
  * @route GET /api/boxes
  * @param req - Express request
  * @param res - Express response
  */
  public async getAll(req: Request, res: Response) {
    try {
      const summary = req.query.summary === "true";
      const response = await boxProductionService.getAll(summary)
      return res.status(200).json(response)
    } catch (error) {
      customLog(`❌ Error en getAll: ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * 📊 Obtiene un resumen de tipos de huevo basado en las cajas registradas.
   * @route GET /api/boxes/summary
   * @param req - Express request
   * @param res - Express response
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
   * 🚛 Envía cajas de producción a ventas.
   * @route POST /api/boxes/sells
   * @param req - Express request
   * @param res - Express response
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
   * 🔄 Sincroniza los códigos de producción desde la base SQL a MongoDB.
   * @route POST /api/boxes/sync
   * @param req - Express request
   * @param res - Express response
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
}

export const boxProductionController: BoxProductionController = new BoxProductionController()
