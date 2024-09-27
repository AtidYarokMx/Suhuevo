/* lib */
import { type ClientSession, AnyBulkWriteOperation } from 'mongoose'
/* models */
import { PersonalBonusModel } from '@app/repositories/mongoose/models/personal-bonus.model'
/* dtos */
import { IPersonalBonus, ICreatePersonalBonus, PersonalBonusEntityType, PersonalBonusType } from '@app/dtos/personal-bonus.dto'
import { BonusModel } from '@app/repositories/mongoose/models/bonus.model'
import { Types } from '@app/repositories/mongoose'
import { CatalogPersonalBonusModel } from '@app/repositories/mongoose/models/catalog-personal-bonus.model'


class PersonalBonusService {
  async get() {
    const bonus = await PersonalBonusModel.find({ active: true }).populate("entityId").exec()
    return bonus
  }

  async getByEmployee(idEmployee: string) {
    const personalBonus = await PersonalBonusModel.aggregate([
      { $match: { idEmployee: new Types.ObjectId(idEmployee), active: true, entityType: "bonus" } },
      { $project: { entityId: true } },
      { $group: { _id: null, ids: { $push: "$entityId" } } },
      { $project: { _id: false, ids: true } }
    ]).exec()
    const catalogBonus = await PersonalBonusModel.aggregate([
      { $match: { idEmployee: new Types.ObjectId(idEmployee), active: true, entityType: "catalog-personal-bonus" } },
      { $project: { entityId: true } },
      { $group: { _id: null, ids: { $push: "$entityId" } } },
      { $project: { _id: false, ids: true } }
    ]).exec()

    const excludedBonusIds = personalBonus.length > 0 ? personalBonus[0].ids : []
    const excludedCatalogBonusIds = catalogBonus.length > 0 ? catalogBonus[0].ids : []

    const generalBonusNotIn = await BonusModel.find({ _id: { $nin: excludedBonusIds }, active: true }).exec()
    const catalogBonusNotIn = await CatalogPersonalBonusModel.find({ _id: { $nin: excludedCatalogBonusIds }, active: true }).exec()

    const assignedBonus = await PersonalBonusModel.find({ idEmployee, active: true, entityType: "bonus" }).populate({ path: "entityId", match: { _id: { $in: excludedBonusIds } } }).exec()
    const assignedCatalogBonus = await PersonalBonusModel.find({ idEmployee, active: true, entityType: "catalog-personal-bonus" }).populate({ path: "entityId", match: { _id: { $in: excludedCatalogBonusIds } } }).exec()

    return { assigned: [...assignedBonus, ...assignedCatalogBonus], notAssigned: [...generalBonusNotIn, ...catalogBonusNotIn] }
  }

  async bulk(body: ICreatePersonalBonus[], idEmployee: string, session: ClientSession) {
    const writes = body.map((item: ICreatePersonalBonus) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: { ...item, idEmployee: new Types.ObjectId(idEmployee) } }, upsert: false } }
      }
      return { insertOne: { document: { ...item, idEmployee: new Types.ObjectId(idEmployee) } } }
    }) as AnyBulkWriteOperation<IPersonalBonus>[]
    const bonus = await PersonalBonusModel.bulkWrite(writes, { session, throwOnValidationError: true })
    return bonus
  }
}

const personalBonusService: PersonalBonusService = new PersonalBonusService()
export default personalBonusService
