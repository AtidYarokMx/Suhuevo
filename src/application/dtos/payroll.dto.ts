import { validateDayFromString } from '@app/utils/date.util'
import { z } from 'zod'

export interface IPayroll {
  id: string
  name: string

  lines: any[]

  startDate: string
  cutoffDate: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export const schemaGenerateWeeklyPayroll = z.object({
  weekStartDate: z.string().date("El formato de la fecha debe ser YYYY-MM-DD").refine(val => validateDayFromString(val, 3), val => ({ message: `${val} debe caer en un día Miércoles` })),
  preview: z.boolean().default(false)
})

export type SchemaGenerateWeeklyPayroll = z.infer<typeof schemaGenerateWeeklyPayroll>