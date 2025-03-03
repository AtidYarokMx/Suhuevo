import type { Request, Response } from 'express';
import { startSession } from 'mongoose';
import shedService from '@services/shed.service';
import { appErrorResponseHandler } from '@app/handlers/response/error.handler';
import { validateObjectId } from '@app/utils/validate.util';
import { AppLocals } from '@app/interfaces/auth.dto';
import { customLog } from '@app/utils/util.util';
import { AppMainMongooseRepo } from '@app/repositories/mongoose';

/**
 * @swagger
 * tags:
 *   name: Sheds
 *   description: Gestión de casetas (Sheds)
 */
class ShedController {

  /**
    * @swagger
    * /api/sheds:
    *   post:
    *     summary: Crea una nueva caseta
    *     tags: [Sheds]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *     responses:
    *       201:
    *         description: Caseta creada exitosamente
    *       400:
    *         description: Datos inválidos proporcionados
    *       500:
    *         description: Error interno del servidor
    */
  public async create(req: Request, res: Response): Promise<Response> {
    customLog("Enter into create shed")
    const session = await AppMainMongooseRepo.startSession();
    session.startTransaction();
    try {
      const body = req.body;
      const locals = res.locals as AppLocals;
      const response = await shedService.create(body, session, locals);
      await session.commitTransaction();
      return res.status(201).json(response);
    } catch (error) {
      await session.abortTransaction();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/initialize:
   *   put:
   *     summary: Inicializa una caseta con datos
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Caseta inicializada exitosamente
   *       400:
   *         description: Datos inválidos o estado incorrecto
   *       500:
   *         description: Error interno del servidor
   */
  public async initializeShed(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    session.startTransaction();
    try {
      validateObjectId(req.params.id);
      const body = req.body;
      const response = await shedService.initializeShed(req.params.id, body, session, res.locals as AppLocals);
      await session.commitTransaction();
      return res.status(200).json(response);
    } catch (error) {
      await session.abortTransaction();
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    } finally {
      await session.endSession();
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/status:
   *   put:
   *     summary: Cambia el estado de una caseta
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *       - in: body
   *         name: status
   *         required: true
   *         description: Nuevo estado de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Estado de caseta actualizado exitosamente
   */
  public async changeShedStatus(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    session.startTransaction();
    try {
      validateObjectId(req.params.id);
      const { status } = req.body;
      const response = await shedService.changeShedStatus(req.params.id, status, session, res.locals as AppLocals);
      await session.commitTransaction();
      return res.status(200).json(response);
    } catch (error) {
      await session.abortTransaction();
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    } finally {
      await session.endSession();
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/daily:
   *   post:
   *     summary: Captura datos diarios de la caseta
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Datos capturados exitosamente
   *       400:
   *         description: Datos inválidos o fuera de rango
   *       500:
   *         description: Error interno del servidor
   */
  public async captureDailyData(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    session.startTransaction();
    try {
      const response = await shedService.captureDailyData(req.params.id, req.body, session, res.locals as AppLocals);
      await session.commitTransaction();
      return res.status(200).json(response);
    } catch (error) {
      await session.abortTransaction();
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    } finally {
      await session.endSession();
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/summary:
   *   get:
   *     summary: Obtiene el resumen de la semana actual
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Resumen semanal obtenido exitosamente
   *       404:
   *         description: Caseta no encontrada
   *       500:
   *         description: Error interno del servidor
   */
  public async getWeeklySummary(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getWeeklySummary(req.params.id);
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/total-summary:
   *   get:
   *     summary: Obtiene el resumen total de la generación actual
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Resumen total obtenido exitosamente
   *       404:
   *         description: Caseta no encontrada
   *       500:
   *         description: Error interno del servidor
   */
  public async getTotalSummary(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getTotalSummary(req.params.id);
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/generations-history:
   *   get:
   *     summary: Obtiene el historial de generaciones
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Historial de generaciones obtenido exitosamente
   *       404:
   *         description: Caseta no encontrada
   *       500:
   *         description: Error interno del servidor
   */
  public async getGenerationsHistory(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getShedHistory(req.params.id);
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}/production-trends:
   *   get:
   *     summary: Obtiene tendencias de producción
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Tendencias de producción obtenidas exitosamente
   *       404:
   *         description: Caseta no encontrada
   *       500:
   *         description: Error interno del servidor
   */
  public async getProductionTrends(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getProductionTrends(req.params.id);
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * @swagger
   * /api/sheds/{id}:
   *   get:
   *     summary: Obtiene una caseta por su identificador
   *     tags: [Sheds]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID de la caseta
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Caseta obtenida exitosamente
   */
  public async getOne(req: Request, res: Response): Promise<Response> {
    try {
      validateObjectId(req.params.id);
      const response = await shedService.getOne(req.params.id);
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }

  /**
   * @swagger
   * /api/sheds:
   *   get:
   *     summary: Obtiene todas las casetas
   *     tags: [Sheds]
   *     responses:
   *       200:
   *         description: Lista de casetas obtenida exitosamente
   */
  public async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getAll();
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: errorMessage });
    }
  }
}

export const shedController: ShedController = new ShedController();
