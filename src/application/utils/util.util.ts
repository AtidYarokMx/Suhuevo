import { mondayToFridaySchedule, tuesdayToSaturdaySchedule } from '@app/constants/schedule.constants'
import { IEmployeSchedule } from '@app/dtos/employee.dto'
import { ObjectId } from 'mongodb'

export function sumField (array: any[], key: string): number {
  if (array.length === 0) return 0

  return array.map(element => {
    const value = parseFloat(element[key])
    return isNaN(value) ? 0 : value
  }).reduce((a: number, b: number) => a + b)
}

export function customLog (...payloads: any[]): void {
  const currentDate = new Date()
  const stringDate = new Intl.DateTimeFormat('es', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentDate)
  console.log(`[${stringDate}]:`, ...payloads)
}

export function getFormattedDate (): string {
  const currentDate = new Date()
  const stringDate = new Intl.DateTimeFormat('es', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentDate)
  return stringDate
}

export function formatDateToYYMMDD(date: Date): string {
  const year = date.getFullYear() % 100;
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);

  return `${year}${month}${day}`;
}

export function concatObjs (objetos: any[]): any {
  const resultado: any = {}

  objetos.forEach((objeto: any, indice: number) => {
    Object.keys(objeto).forEach((propiedad: string) => {
      const nuevaPropiedad = `${propiedad}${String(indice + 1)}`
      resultado[nuevaPropiedad] = objeto[propiedad]
    })
  })
  return resultado
}

export function generateRandomString (length: number): string {
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length))
  }
  return result
}

export function removeInvalidIds (arr: any[]): string[] {
  return arr.filter((x: string) => ObjectId.isValid(x))
}

export function arrayToObject (array: any, keyField: string): any {
  const result: any = {}
  for (const item of array) {
    result[item[keyField]] = item
  }
  return result
}

export function groupBy<T>(records: T[], key: keyof T): { [key: string]: T[] } {
  return records.reduce((acc: { [key: string]: T[] }, record: T) => {
    const groupKey = String(record[key]); 
    acc[groupKey] = acc[groupKey] || [];
    acc[groupKey].push(record);
    return acc;
  }, {});
}

export function getBaseSchedule(jobScheme: any, timeEntry: string, timeDeparture: string): IEmployeSchedule {
  if (String(jobScheme) === '5') {
    return mondayToFridaySchedule(timeEntry, timeDeparture)
  } 
  
  if (String(jobScheme) === '6') {
    return tuesdayToSaturdaySchedule(timeEntry, timeDeparture)
  }
  
  return mondayToFridaySchedule(timeEntry, timeDeparture)
}


export function getLastTuesday(date: Date): Date {
  const lastTuesday = new Date(date);
  const dayOfWeek = date.getDay();
  const offset = (dayOfWeek >= 2) ? dayOfWeek - 2 : 6 - (2 - dayOfWeek);
  lastTuesday.setDate(date.getDate() - offset);
  return lastTuesday;
}

export function getNextTuesday(date: Date): Date {
  const nextTuesday = new Date(date);
  const dayOfWeek = date.getDay();
  const offset = (dayOfWeek <= 2) ? 2 - dayOfWeek : 9 - dayOfWeek;
  nextTuesday.setDate(date.getDate() + offset);
  return nextTuesday;
}

export function getLastWednesday(date: Date): Date {
  const lastWednesday = new Date(date);
  const dayOfWeek = date.getDay();
  const offset = (dayOfWeek >= 3) ? dayOfWeek - 3 : 6 - (3 - dayOfWeek);
  lastWednesday.setDate(date.getDate() - offset);
  return lastWednesday;
}

export function formatDate(date: Date): string {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date);
  return `${day} de ${month}`;
};
