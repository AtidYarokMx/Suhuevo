/* lib */
import { type ClientSession, AnyBulkWriteOperation } from 'mongoose'
/* models */
import { PersonalBonusModel } from '@app/repositories/mongoose/models/personal-bonus.model'
/* dtos */
import { IPersonalBonus, ICreatePersonalBonus } from '@app/dtos/personal-bonus.dto'


class PersonalBonusService {
  async get() {
    const bonus = await PersonalBonusModel.find({ active: true }).exec()
    return bonus
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
