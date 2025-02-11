import { z } from 'zod'
/* types */
import { Types } from '@app/repositories/mongoose'
import { ShedStatus } from '@app/dtos/shed.dto'

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
export function isValidStatusChange(currentStatus: ShedStatus, newStatus: ShedStatus): boolean {
  const validTransitions = {
    [ShedStatus.INACTIVE]: [ShedStatus.CLEANING],
    [ShedStatus.CLEANING]: [ShedStatus.READY_TO_PRODUCTION],
    [ShedStatus.READY_TO_PRODUCTION]: [ShedStatus.PRODUCTION],
    [ShedStatus.PRODUCTION]: [ShedStatus.INACTIVE],
  };

  // Si es una nueva caseta, siempre permitir el estado inicial
  if (!currentStatus) return true;

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}