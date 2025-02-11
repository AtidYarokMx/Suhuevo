import type { Request, Response } from "express";
/* 📌 Repositorios */
import { AppMainMongooseRepo } from "@app/repositories/mongoose";
/* 📌 Servicios */
import farmService from "@services/farm.service";
/* 📌 Handlers */
import { appErrorResponseHandler } from "@app/handlers/response/error.handler";
/* 📌 Validaciones */
import { validateObjectId } from "@app/utils/validate.util";
/* 📌 DTOs */
import { createFarm, createFarmBody, updateFarm, updateFarmBody } from "@app/dtos/farm.dto";
import { AppLocals } from "@app/interfaces/auth.dto";
/* 📌 Utilidades */
import { customLog } from "@app/utils/util.util";

/**
 * 📌 Controlador para la gestión de granjas (Farms)
 */
class FarmController {

  /**
   * 🔍 Obtiene una granja por su identificador
   * @route GET /api/farms/:id
   */
  public async getOne(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    customLog(`📌 FarmController.getOne: Buscando granja con ID: ${id}`);

    try {
      validateObjectId(id);
      const response = await farmService.getOne(id);

      if (!response) {
        customLog(`⚠️ FarmController.getOne: Granja no encontrada - ID: ${id}`);
        return res.status(404).json({ message: "Granja no encontrada" });
      }

      customLog(`✅ FarmController.getOne: Granja encontrada - ID: ${id}`);
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ FarmController.getOne: Error al obtener granja - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 📢 Obtiene todas las granjas activas
   * @route GET /api/farms
   */
  public async getAll(req: Request, res: Response): Promise<Response> {
    customLog(`📌 FarmController.getAll: Consultando todas las granjas`);

    try {
      const response = await farmService.getAll();
      customLog(`✅ FarmController.getAll: Se encontraron ${response.length} granjas`);
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ FarmController.getAll: Error al obtener granjas - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 🔍 Obtiene una granja con sus casetas asociadas
   * @route GET /api/farms/:id/sheds
   */
  public async getOneWithSheds(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    customLog(`📌 FarmController.getOneWithSheds: Buscando granja con casetas - ID: ${id}`);

    try {
      validateObjectId(id);
      const response = await farmService.getOneWithSheds(id);

      if (!response) {
        customLog(`⚠️ FarmController.getOneWithSheds: Granja no encontrada - ID: ${id}`);
        return res.status(404).json({ message: "Granja no encontrada" });
      }

      customLog(`✅ FarmController.getOneWithSheds: Granja encontrada con casetas - ID: ${id}`);
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ FarmController.getOneWithSheds: Error al obtener granja con casetas - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 📢 Obtiene todas las granjas con sus casetas asociadas
   * @route GET /api/farms/sheds
   */
  public async getAllWithSheds(req: Request, res: Response): Promise<Response> {
    customLog(`📌 FarmController.getAllWithSheds: Consultando todas las granjas con casetas`);

    try {
      const response = await farmService.getAllWithSheds();
      customLog(`✅ FarmController.getAllWithSheds: Se encontraron ${response.length} granjas con casetas`);
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ FarmController.getAllWithSheds: Error al obtener granjas con casetas - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  /**
   * 🏗️ Crea una nueva granja
   * @route POST /api/farms
   */
  public async create(req: Request, res: Response): Promise<Response> {
    const body = req.body as createFarmBody;
    const locals = res.locals as AppLocals;
    const session = await AppMainMongooseRepo.startSession();

    try {
      customLog(`📌 FarmController.create: Creando nueva granja con datos: ${JSON.stringify(body)}`);
      session.startTransaction();

      const validatedBody = createFarm.parse(body);
      const response = await farmService.create(validatedBody, session, locals);

      await session.commitTransaction();
      customLog(`✅ FarmController.create: Granja creada exitosamente - ID: ${response._id}`);
      return res.status(201).json(response);
    } catch (error) {
      await session.abortTransaction();
      customLog(`❌ FarmController.create: Error al crear granja - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  /**
   * 🛠️ Actualiza los datos de una granja
   * @route PUT /api/farms/:id
   */
  public async update(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    const body = req.body as updateFarmBody;
    const locals = res.locals as AppLocals;
    const session = await AppMainMongooseRepo.startSession();

    try {
      session.startTransaction();
      validateObjectId(id);
      updateFarm.parse(body);

      customLog(`📌 FarmController.update: Actualizando granja con ID: ${id}`);
      const response = await farmService.update(id, body, session, locals);

      await session.commitTransaction();
      customLog(`✅ FarmController.update: Granja actualizada con éxito - ID: ${id}`);
      return res.status(200).json(response);
    } catch (error) {
      await session.abortTransaction();
      customLog(`❌ FarmController.update: Error al actualizar granja - ${String(error)}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }
}

export const farmController: FarmController = new FarmController();
