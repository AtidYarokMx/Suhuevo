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
      { $match: { idEmployee: new Types.ObjectId(idEmployee), active: true } },
      { $project: { entityId: true } },
      { $group: { _id: null, ids: { $push: "$entityId" } } },
      { $project: { _id: false, ids: true } }
    ]).exec()

    const excludedIds = personalBonus.length > 0 ? personalBonus[0].ids : []
    const generalBonus = await BonusModel.find({ _id: { $nin: excludedIds }, active: true }).exec()
    const catalogBonus = await CatalogPersonalBonusModel.find({ _id: { $nin: excludedIds }, active: true }).exec()
    const employeeBonus = await PersonalBonusModel.find({ idEmployee, active: true }).exec()
    return [...generalBonus, ...catalogBonus, ...employeeBonus]
  }

  async bulk(body: ICreatePersonalBonus[], session: ClientSession) {
    const writes = body.map((item: ICreatePersonalBonus) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: item }, upsert: false } }
      }
      return { insertOne: { document: item } }
    }) as AnyBulkWriteOperation<IPersonalBonus>[]
    const bonus = await PersonalBonusModel.bulkWrite(writes, { session })
    return bonus
  }
}

const personalBonusService: PersonalBonusService = new PersonalBonusService()
export default personalBonusService
