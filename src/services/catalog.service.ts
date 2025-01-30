/* lib */
import { z } from 'zod'
import { AnyBulkWriteOperation, type ClientSession } from 'mongoose'
/* models */
import { CatalogEggModel } from '@app/repositories/mongoose/catalogs/egg.catalog'
import { CatalogRuleModel } from '@app/repositories/mongoose/models/catalog-rule.model'
import { CatalogPaymentMethodModel } from '@app/repositories/mongoose/catalogs/payment-method.catalog'
import { CatalogPersonalBonusModel } from '@app/repositories/mongoose/models/catalog-personal-bonus.model'
/* dtos */
import { ICatalogPersonalBonus, ICreateCatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'
import { ICatalogRule, ICreateBody as ICreateCatalogRuleBody } from '@app/dtos/catalog-rule.dto'
import { createPaymentMethodBody } from '@app/dtos/payment-method.dto'
import { createEggType } from '@app/dtos/egg.dto'
import { AppLocals } from '@app/interfaces/auth.dto'


class CatalogService {
  /* personal bonus */
  async getPersonalBonus() {
    const catalog = await CatalogPersonalBonusModel.find({ active: true }).exec()
    return catalog
  }

  async createPersonalBonus(body: ICreateCatalogPersonalBonus, session: ClientSession) {
    const catalog = new CatalogPersonalBonusModel({ ...body, active: true })
    const savedCatalog = await catalog.save({ session, validateBeforeSave: true })
    return savedCatalog.toJSON()
  }

  async bulkPersonalBonus(body: ICreateCatalogPersonalBonus[], session: ClientSession) {
    const writes = body.map((item: ICreateCatalogPersonalBonus) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: item }, upsert: false } }
      }
      return { insertOne: { document: item } }
    }) as AnyBulkWriteOperation<ICatalogPersonalBonus>[]
    const savedCatalogs = await CatalogPersonalBonusModel.bulkWrite(writes, { session })
    return savedCatalogs
  }

  /* rules */
  async getRules() {
    const catalog = await CatalogRuleModel.find({ active: true }).exec()
    return catalog
  }

  async createCatalogRule(body: ICreateCatalogRuleBody, session: ClientSession) {
    const catalog = new CatalogRuleModel({ ...body, active: true })
    const savedCatalog = await catalog.save({ session, validateBeforeSave: true })
    return savedCatalog.toJSON()
  }

  async bulkCatalogRule(body: ICreateCatalogRuleBody[], session: ClientSession) {
    const writes = body.map((item: ICreateCatalogRuleBody) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: item }, upsert: false } }
      }
      return { insertOne: { document: item } }
    }) as AnyBulkWriteOperation<ICatalogRule>[]
    const savedCatalogs = await CatalogRuleModel.bulkWrite(writes, { session })
    return savedCatalogs
  }

  /* create catalog egg type */
  async createCtalogEggType(body: z.infer<typeof createEggType>, session: ClientSession) {
    const catalog = new CatalogEggModel({ ...body, active: true })
    const saved = await catalog.save({ session, validateBeforeSave: true })
    return saved.toJSON()
  }

  /* payment methods catalog */
  async getPaymentMethods() {
    const catalog = await CatalogPaymentMethodModel.find({ active: true }).exec()
    return catalog
  }

  async createPaymentMethod(body: z.infer<typeof createPaymentMethodBody>, session: ClientSession, locals: AppLocals) {
    const user = locals.user._id
    const catalog = new CatalogPaymentMethodModel({ ...body, active: true, createdBy: user, lastUpdateBy: user })
    const savedCatalog = await catalog.save({ session, validateBeforeSave: true })
    return savedCatalog.toJSON()
  }
}

const catalogService: CatalogService = new CatalogService()
export default catalogService
