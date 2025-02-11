import type { Request, Response } from 'express';
import { startSession } from 'mongoose';
import { customLog } from '@app/utils/util.util';

/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose';

/* services */
import shedService from '@services/shed.service';

/* handlers */
import { appErrorResponseHandler, AppErrorResponse } from '@app/handlers/response/error.handler';

/* validation utils */
import { validateObjectId } from '@app/utils/validate.util';

/* dtos */
import {
  createShed,
  createShedBody,
  ShedStatus,
  initializeShed
} from '@app/dtos/shed.dto';
import { AppLocals } from '@app/interfaces/auth.dto';

/**
 * 📌 Controlador para la gestión de casetas (Sheds)
 */
class ShedController {

  /**
   * 🏗️ Crea una nueva caseta
   * @route POST /api/shed
   */
  public async create(req: Request, res: Response): Promise<Response> {
    const body = req.body as createShedBody;
    const locals = res.locals as AppLocals;
    const session = await AppMainMongooseRepo.startSession();

    try {
      customLog(`📌 ShedController.create: Creando caseta con datos: ${JSON.stringify(body)}`);
      session.startTransaction();

      const validatedBody = createShed.parse(body);
      const response = await shedService.create(validatedBody, session, locals);

      await session.commitTransaction();
      customLog(`✅ ShedController.create: Caseta creada exitosamente con id: ${response._id}`);
      return res.status(201).json(response);
    } catch (error: any) {
      await session.abortTransaction();
      customLog(`❌ ShedController.create: Error al crear caseta: ${error.message}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  /**
   * 🚀 Inicializa una caseta con los datos obligatorios
   * @route PUT /api/shed/:id/initialize
   */
  public async initializeShed(req: Request, res: Response): Promise<Response> {
    const session = await startSession();
    session.startTransaction();
    try {
      validateObjectId(req.params.id);
      const body = initializeShed.parse(req.body);
      const updatedShed = await shedService.initializeShed(req.params.id, body, session, res.locals as AppLocals);

      await session.commitTransaction();
      customLog(`✅ ShedController.initializeShed: Caseta inicializada - ID: ${req.params.id}`);
      return res.status(200).json(updatedShed);
    } catch (error: any) {
      customLog(`❌ ShedController.initializeShed: Error al inicializar caseta - ${error.message}`);
      await session.abortTransaction();
      return res.status(error.statusCode || 500).json({ message: error.message });
    } finally {
      await session.endSession();
    }
  }

  /**
   * 🔄 Cambia el estado de una caseta
   * @route PUT /api/shed/:id/status
   */
  public async changeShedStatus(req: Request, res: Response): Promise<Response> {
    const session = await startSession();
    session.startTransaction();
    try {
      validateObjectId(req.params.id);
      const { status } = req.body;
      if (!Object.values(ShedStatus).includes(status)) {
        throw new AppErrorResponse({ statusCode: 400, name: "InvalidStatus", message: "Estado no válido." });
      }

      const updatedShed = await shedService.changeShedStatus(req.params.id, status, session, res.locals as AppLocals);

      await session.commitTransaction();
      customLog(`✅ ShedController.changeShedStatus: Estado cambiado a '${status}' - ID: ${req.params.id}`);
      return res.status(200).json(updatedShed);
    } catch (error: any) {
      await session.abortTransaction();
      customLog(`❌ ShedController.changeShedStatus: Error al cambiar estado - ${error.message}`);
      return res.status(error.statusCode || 500).json({ message: error.message });
    } finally {
      await session.endSession();
    }
  }

  /**
   * 🛠️ Actualiza una caseta
   * @route PUT /api/shed/:id
   */
  public async updateShed(req: Request, res: Response): Promise<Response> {
    const session = await startSession();
    session.startTransaction();

    try {
      validateObjectId(req.params.id);
      const updatedShed = await shedService.updateShedData(req.params.id, req.body, session, res.locals as AppLocals);

      await session.commitTransaction();
      customLog(`✅ ShedController.updateShed: Caseta actualizada con id: ${req.params.id}`);
      return res.status(200).json(updatedShed);
    } catch (error: any) {
      await session.abortTransaction();
      customLog(`❌ ShedController.updateShed: Error al actualizar caseta: ${error.message}`);
      return res.status(error.statusCode || 500).json({ message: error.message });
    } finally {
      await session.endSession();
    }
  }

  /**
   * 📜 Obtiene el historial de una caseta con filtro de fechas opcional
   * @route GET /api/shed/:id/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  public async getShedHistory(req: Request, res: Response): Promise<Response> {
    try {
      validateObjectId(req.params.id);
      const { startDate, endDate } = req.query;

      const history = await shedService.getShedHistory(
        req.params.id,
        startDate as string,
        endDate as string
      );

      customLog(`✅ ShedController.getShedHistory: Historial obtenido para caseta con id: ${req.params.id}`);
      return res.status(200).json(history);
    } catch (error: any) {
      customLog(`❌ ShedController.getShedHistory: Error al obtener historial: ${error.message}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 🔍 Obtiene una caseta por su identificador
   * @route GET /api/shed/:id
   */
  public async getOne(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    customLog(`📌 ShedController.getOne: Consultando caseta con id: ${id}`);

    try {
      validateObjectId(id);
      const response = await shedService.getOne(id);
      customLog(`✅ ShedController.getOne: Caseta encontrada con id: ${id}`);
      return res.status(200).json(response);
    } catch (error: any) {
      customLog(`❌ ShedController.getOne: Error al obtener caseta: ${error.message}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 📢 Obtiene todas las casetas activas
   * @route GET /api/sheds
   */
  public async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const response = await shedService.getAll();
      customLog(`✅ ShedController.getAll: Se obtuvieron ${response.length} casetas`);
      return res.status(200).json(response);
    } catch (error: any) {
      customLog(`❌ ShedController.getAll: Error al obtener casetas: ${error.message}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }
}

export const shedController: ShedController = new ShedController();
