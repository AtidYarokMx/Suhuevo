/* lib */
import { AnyBulkWriteOperation, type ClientSession } from 'mongoose'
/* models */
import { CatalogPersonalBonusModel } from '@app/repositories/mongoose/models/catalog-personal-bonus.model'
import { CatalogRuleModel } from '@app/repositories/mongoose/models/catalog-rule.model'
/* dtos */
import { ICatalogPersonalBonus, ICreateCatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'
import { ICatalogRule, ICreateBody as ICreateCatalogRuleBody } from '@app/dtos/catalog-rule.dto'


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
}

const catalogService: CatalogService = new CatalogService()
export default catalogService
