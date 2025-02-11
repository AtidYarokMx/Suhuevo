import { z } from 'zod'
/* types */
import { Types } from '@app/repositories/mongoose'

export function validateObjectId(id: string) {
  const schema = z.string({ message: "El formato del id es incorrecto" }).refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` }))
  return schema.parse(id)
}

export function validateBarcode(code: string) {
  const schema = z.string().length(21)
  return schema.parse(code)
}

type Status = 'inactive' | 'cleaning' | 'readyToProduction' | 'production';

export const validStatusTransitions: Record<Status, Status[]> = {
  inactive: ["cleaning"],
  cleaning: ["readyToProduction"],
  readyToProduction: ["production"],
  production: ["inactive", "cleaning"],
};

/**
export function isValidStatusChange(currentStatus: Status, newStatus: Status): boolean {
 */
export function isValidStatusChange(currentStatus: Status, newStatus: Status): boolean {
  return validStatusTransitions[currentStatus]?.includes(newStatus) ?? false;
}