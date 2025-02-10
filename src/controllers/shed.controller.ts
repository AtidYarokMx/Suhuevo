/* express */
import type { Request, Response } from 'express'
import { customLog } from '@app/utils/util.util'

/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'

/* services */
import shedService from '@services/shed.service'

/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'

/* validation utils */
import { validateObjectId } from '@app/utils/validate.util'

/* dtos */
import { createShed, createShedBody, updateShed, updateShedBody } from '@app/dtos/shed.dto'
import { AppLocals } from '@app/interfaces/auth.dto'

/**
 * Controlador para la gestión de casetas.
 */
class ShedController {
  /**
   * Obtiene una caseta por su identificador.
   *
   * @param req - Request de Express.
   * @param res - Response de Express.
   * @returns La caseta encontrada.
   */
  public async getOne(req: Request, res: Response): Promise<Response> {
    const id = req.params.id
    customLog(`ShedController.getOne: Iniciando consulta para la caseta con id: ${id}`)

    try {
      // Validar que el id tenga un formato correcto.
      validateObjectId(id)
      const response = await shedService.getOne(id)
      customLog(`ShedController.getOne: Caseta encontrada para id: ${id}`)
      return res.status(200).json(response)
    } catch (error: any) {
      customLog(`ShedController.getOne: Error al obtener caseta con id ${id}: ${error.message}`)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * Obtiene todas las casetas activas.
   *
   * @param req - Request de Express.
   * @param res - Response de Express.
   * @returns Lista de casetas activas.
   */
  public async getAll(req: Request, res: Response): Promise<Response> {
    customLog(`ShedController.getAll: Iniciando consulta de todas las casetas`)

    try {
      const response = await shedService.getAll()
      customLog(`ShedController.getAll: Se han obtenido ${response.length} casetas`)
      return res.status(200).json(response)
    } catch (error: any) {
      customLog(`ShedController.getAll: Error al obtener casetas: ${error.message}`)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /**
   * Crea una nueva caseta.
   *
   * @param req - Request de Express.
   * @param res - Response de Express.
   * @returns La caseta creada.
   */
  public async create(req: Request, res: Response): Promise<Response> {
    const body = req.body as createShedBody
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()

    try {
      customLog(`ShedController.create: Iniciando creación de caseta con datos: ${JSON.stringify(body)}`)
      session.startTransaction()

      // Validar el body con el schema correspondiente.
      const validatedBody = createShed.parse(body)
      const response = await shedService.create(validatedBody, session, locals)

      await session.commitTransaction()
      customLog(`ShedController.create: Caseta creada exitosamente con id: ${response._id}`)
      return res.status(200).json(response)
    } catch (error: any) {
      await session.abortTransaction()
      customLog(`ShedController.create: Error al crear caseta: ${error.message}`)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    } finally {
      await session.endSession()
    }
  }

  /**
   * Actualiza una caseta existente.
   *
   * @param req - Request de Express.
   * @param res - Response de Express.
   * @returns La caseta actualizada.
   */
  public async update(req: Request, res: Response): Promise<Response> {
    const id = req.params.id
    const body = req.body as updateShedBody
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()

    try {
      customLog(`ShedController.update: Iniciando actualización de caseta con id: ${id} y datos: ${JSON.stringify(body)}`)
      session.startTransaction()

      // Validar que el id tenga un formato correcto.
      validateObjectId(id)

      // Validar el body con el schema correspondiente.
      const validatedBody = updateShed.parse(body)
      const response = await shedService.update(id, validatedBody, session, locals)

      await session.commitTransaction()
      customLog(`ShedController.update: Caseta actualizada exitosamente con id: ${id}`)
      return res.status(200).json(response)
    } catch (error: any) {
      await session.abortTransaction()
      customLog(`ShedController.update: Error al actualizar caseta con id ${id}: ${error.message}`)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    } finally {
      await session.endSession()
    }
  }
}

export const shedController: ShedController = new ShedController()
