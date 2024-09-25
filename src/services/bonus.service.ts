/* lib */
import { type Types } from '@app/repositories/mongoose'
import { type FlattenMaps, type ClientSession, AnyBulkWriteOperation } from 'mongoose'
/* models */
import { BonusModel } from '@app/repositories/mongoose/models/bonus.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import { IBonus, ICreateBonus } from '@app/dtos/bonus.dto'
import { AppLocals } from '@app/interfaces/auth.dto'


class BonusService {
  async get() {
    const bonus = await BonusModel.find({ active: true }).exec()
    return bonus
  }

  async bulk(body: ICreateBonus[], session: ClientSession) {
    const writes = body.map((item: ICreateBonus) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: item }, upsert: false } }
      }
      return { insertOne: { document: item } }
    }) as AnyBulkWriteOperation<IBonus>[]
    const bonus = await BonusModel.bulkWrite(writes, { session })
    return bonus
  }
}

const bonusService: BonusService = new BonusService()
export default bonusService
