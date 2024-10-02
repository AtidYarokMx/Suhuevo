/* lib */
import { type Types } from '@app/repositories/mongoose'
import { type FlattenMaps, type ClientSession, AnyBulkWriteOperation } from 'mongoose'
/* models */
import { BonusModel } from '@app/repositories/mongoose/models/bonus.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { bigMath } from '@app/utils/math.util'
/* dtos */
import type { ICreateBody } from '@app/dtos/rule.dto'


class RuleService {
  async create(body: ICreateBody, session: ClientSession) {
    const example = { dailySalary: 535.71, extraHours: 2.5 }
    const result = bigMath.evaluate(body.formula, example)
    return result
  }
}

const ruleService: RuleService = new RuleService()
export default ruleService
