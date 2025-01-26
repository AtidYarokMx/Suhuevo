/* repo */
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import type { IRule } from '@app/dtos/rule.dto'
/* loggers */
import { UserLogger } from '@app/handlers/loggers/user.logger'

export const RuleSchema = new Schema<IRule>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  formula: { type: String, trim: true, required: true },
  variables: { type: [String], required: true },
  priority: { type: Number, default: 1 },
  enabled: { type: Boolean, default: true },
  taxable: { type: Boolean, default: true },
  /* populated */
  entityId: { type: Schema.Types.ObjectId, ref: "catalog-rule", required: true },
  idEmployee: { type: Schema.Types.ObjectId, ref: "user", required: true },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* pre (middlewares) */
RuleSchema.pre('save', function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
RuleSchema.post('save', function (doc) {
  UserLogger.info(`[Rule][${String(doc._id)}] Datos de reset creados: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const RuleModel = AppMainMongooseRepo.model<IRule>('rule', RuleSchema)
