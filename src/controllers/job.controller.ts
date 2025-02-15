import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
import jobService from '../services/job.service'
import { customLog } from '@app/utils/util.util'

/**
 * @swagger
 * tags:
 *   name: Job
 *   description: Endpoints para gestionar los puestos de trabajo
 */

class JobController {

  /**
   * @swagger
   * /api/job:
   *   get:
   *     summary: Obtener puestos de trabajo
   *     description: Retorna una lista de todos los puestos de trabajo disponibles.  
   *                  Si se proporciona `ids`, devuelve solo los trabajos con esos IDs.
   *     tags: [Job]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: ids
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         required: false
   *         description: Lista de IDs de los trabajos a obtener. Si se omite, devuelve todos los trabajos.
   *     responses:
   *       200:
   *         description: Lista de trabajos obtenida correctamente.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Job'
   *       401:
   *         description: No autorizado (Falta token JWT).
   *       500:
   *         description: Error del servidor.
   */
  public async getJobs(req: Request, res: Response): Promise<any> {
    const query = req.query;
    try {
      customLog(`[GET] /api/job - Query: ${JSON.stringify(query)}`);
      const response = await jobService.get(req.query)
      return res.status(200).json(response)
    } catch (error) {
      customLog(`❌ [JobController.get] Error: ${error}`);
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * @swagger
   * /api/job/create:
   *   post:
   *     summary: Crear un nuevo puesto de trabajo
   *     description: Crea un nuevo puesto de trabajo en la base de datos.
   *     tags: [Job]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Desarrollador Backend"
   *               departmentId:
   *                 type: string
   *                 example: "679d8fb8ad87cb0d5d37c69a"
   *     responses:
   *       200:
   *         description: Trabajo creado exitosamente.
   *       400:
   *         description: Datos inválidos.
   *       500:
   *         description: Error interno del servidor.
   */
  public async create(req: Request, res: Response): Promise<any> {
    const body = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      customLog(`[POST] /api/job/create - Body: ${JSON.stringify(body)}`);
      session.startTransaction()
      const response = await jobService.create(req.body, session)
      await session.commitTransaction()
      await session.endSession()
      customLog(`✅ [JobController.create] Puesto creado con ID: ${response.id}`);
      return res.status(200).json(response)
    } catch (error) {
      customLog(`❌ [JobController.create] Error al crear puesto: ${error}`);
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * @swagger
   * /api/job/update:
   *   patch:
   *     summary: Actualizar un puesto de trabajo existente
   *     description: Actualiza los datos de un puesto de trabajo identificado por su ID.
   *     tags: [Job]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 example: "679d8fb8ad87cb0d5d37c69a"
   *               name:
   *                 type: string
   *                 example: "Gerente de Proyecto"
   *               departmentId:
   *                 type: string
   *                 example: "679d8fb8ad87cb0d5d37c69a"
   *     responses:
   *       200:
   *         description: Trabajo actualizado exitosamente.
   *       404:
   *         description: No se encontró el trabajo.
   *       500:
   *         description: Error interno del servidor.
   */
  public async update(req: Request, res: Response): Promise<any> {
    const body = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      customLog(`[PATCH] /api/job/update - Body: ${JSON.stringify(body)}`);
      session.startTransaction()
      const response = await jobService.update(req.body, session)
      await session.commitTransaction()
      await session.endSession()
      customLog(`✅ [JobController.update] Puesto actualizado con ID: ${response.id}`);
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      customLog(`❌ [JobController.update] Error al actualizar puesto: ${error}`);
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * @swagger
   * /api/job/search:
   *   get:
   *     summary: Buscar puestos de trabajo con filtros
   *     description: Retorna una lista de trabajos filtrados según los parámetros de búsqueda.
   *     tags: [Job]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: name
   *         schema:
   *           type: string
   *         description: Filtrar por nombre del puesto de trabajo.
   *       - in: query
   *         name: departmentId
   *         schema:
   *           type: string
   *         description: Filtrar por departamento.
   *     responses:
   *       200:
   *         description: Lista de trabajos obtenida correctamente.
   *       400:
   *         description: Filtro inválido.
   *       500:
   *         description: Error interno del servidor.
   */
  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      customLog(`[GET] /api/job/search - Query: ${JSON.stringify(query)}`);
      const response = await jobService.search(req.query)
      return res.status(200).json(response)
    } catch (error) {
      customLog(`❌ [JobController.search] Error en búsqueda de puestos: ${error}`);
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const jobController: JobController = new JobController()

