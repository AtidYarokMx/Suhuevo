/* lib */
import { z } from 'zod'
/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import catalogService from '@services/catalog.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { ICreateCatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'
import { ICreateBody as ICreateCatalogRuleBody } from '@app/dtos/catalog-rule.dto'
import { createEggType } from '@app/dtos/egg.dto'
import { createPaymentMethodBody } from '@app/dtos/payment-method.dto'
import { AppLocals } from '@app/interfaces/auth.dto'
import { createBoxCategoryBody, createBoxTypeBody } from '@app/dtos/box-production.dto'

class CatalogController {
  /* personal bonus */
  public async getPersonalBonus(req: Request, res: Response) {
    try {
      const response = await catalogService.getPersonalBonus()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createPersonalBonus(req: Request, res: Response) {
    const body = req.body as ICreateCatalogPersonalBonus
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await catalogService.createPersonalBonus(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async bulkPersonalBonus(req: Request, res: Response) {
    const body = req.body as ICreateCatalogPersonalBonus[]
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await catalogService.bulkPersonalBonus(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /* rule */
  public async getRules(req: Request, res: Response) {
    try {
      const response = await catalogService.getRules()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createCatalogRule(req: Request, res: Response) {
    const body = req.body as ICreateCatalogRuleBody
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await catalogService.createCatalogRule(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async bulkCatalogRule(req: Request, res: Response) {
    const body = req.body as ICreateCatalogRuleBody[]
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await catalogService.bulkCatalogRule(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /* catálogo de tipo de huevos */
  public async createCatalogEggType(req: Request, res: Response) {
    const body = req.body as z.infer<typeof createEggType>
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const validatedBody = createEggType.parse(body)
      const response = await catalogService.createCtalogEggType(validatedBody, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /* catálogo de los métodos de pago */
  public async getPaymentMethods(req: Request, res: Response) {
    try {
      const response = await catalogService.getPaymentMethods()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createPaymentMethod(req: Request, res: Response) {
    const body = req.body as z.infer<typeof createPaymentMethodBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const validatedBody = createPaymentMethodBody.parse(body)
      const response = await catalogService.createPaymentMethod(validatedBody, session, locals)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  /* catálogo de tipos de caja de huevo */
  public async getBoxTypes(req: Request, res: Response) {
    try {
      const response = await catalogService.getBoxTypes()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createBoxType(req: Request, res: Response) {
    const body = req.body as z.infer<typeof createBoxTypeBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const validatedBody = createBoxTypeBody.parse(body)
      const response = await catalogService.createBoxType(validatedBody, session, locals)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createCategoryBoxType(req: Request, res: Response) {
    const body = req.body as z.infer<typeof createBoxCategoryBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const validatedBody = createBoxCategoryBody.parse(body)
      const response = await catalogService.createBoxCategory(validatedBody, session, locals)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const catalogController: CatalogController = new CatalogController()
