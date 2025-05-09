/* repo */
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import type { ICatalogRule } from '@app/dtos/catalog-rule.dto'

export const CatalogRuleSchema = new Schema<ICatalogRule>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  formula: { type: String, trim: true, required: true },
  variables: { type: [String], required: true },
  priority: { type: Number, default: 1 },
  enabled: { type: Boolean, default: true },
  taxable: { type: Boolean, default: true },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
})

/* pre (middlewares) */
CatalogRuleSchema.pre('save', function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* model instance */
export const CatalogRuleModel = AppMainMongooseRepo.model<ICatalogRule>('catalog-rule', CatalogRuleSchema)
