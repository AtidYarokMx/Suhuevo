/* lib */
import { Types } from '@app/repositories/mongoose'
import { type FlattenMaps, type ClientSession, AnyBulkWriteOperation } from 'mongoose'
/* models */
import { CatalogRuleModel } from '@app/repositories/mongoose/models/catalog-rule.model'
import { RuleModel } from '@app/repositories/mongoose/models/rule.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { bigMath } from '@app/utils/math.util'
/* dtos */
import type { ICreateBody, IUpdateBody, IRule } from '@app/dtos/rule.dto'


class RuleService {
  async get() {
    const rules = await RuleModel.find({ active: true }).populate("idEmployee").exec()
    return rules
  }

  async getByEmployee(idEmployee: string) {
    const userRules = await RuleModel.aggregate([
      { $match: { idEmployee: new Types.ObjectId(idEmployee), active: true } },
      { $project: { entityId: true } },
      { $group: { _id: null, ids: { $push: "$entityId" } } },
      { $project: { _id: false, ids: true } }
    ]).exec()

    const excludedIds = userRules.length > 0 ? userRules[0].ids : []

    const notAssigned = await CatalogRuleModel.find({ _id: { $nin: excludedIds }, active: true }).exec()
    const assigned = await RuleModel.find({ active: true, idEmployee }).populate({ path: "entityId", match: { _id: { $in: excludedIds }, active: true } }).exec()

    return { assigned, notAssigned }
  }

  async create(body: ICreateBody, session: ClientSession) {
    const rule = new RuleModel({ ...body })
    // const example = { dailySalary: 535.71, extraHours: 2.5 }
    // const result = bigMath.evaluate(body.formula, example)
    const savedRule = await rule.save({ session, validateBeforeSave: true })
    return savedRule.toJSON()
  }

  async assign(body: IUpdateBody[], idEmployee: string, session: ClientSession) {
    const writes = body.map((item: IUpdateBody) => {
      if (typeof item._id !== "undefined") {
        if (typeof item.active !== "undefined" && item.active === false) {
          return { updateOne: { filter: { _id: item._id }, update: { $set: { active: false } } } }
        }
        return { updateOne: { filter: { _id: item._id }, update: { $set: { ...item, idEmployee: new Types.ObjectId(idEmployee) } }, upsert: false } }
      }
      return { insertOne: { document: { ...item, idEmployee: new Types.ObjectId(idEmployee) } } }
    }) as AnyBulkWriteOperation<IRule>[]
    const rule = await RuleModel.bulkWrite(writes, { session, throwOnValidationError: true })
    return rule
  }

  async unassign(_id: string, idEmployee: string, session: ClientSession) {
    const rule = await RuleModel.updateOne({ _id, idEmployee }, { active: false }, { session }).exec()
    return rule
  }
}

const ruleService: RuleService = new RuleService()
export default ruleService
