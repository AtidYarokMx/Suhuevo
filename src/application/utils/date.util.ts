import moment, { Moment } from "moment";

const defaultDateFormat = "YYYY-MM-DD"

export function formatParse(dateString: string, format: string = defaultDateFormat) {
  return moment(dateString, format)
}

export function parse(dateString: string) {
  return moment(dateString, "M/D/YYYY H:m")
}

export function validateYear(year: string) {
  return moment(year, "YYYY", true).isValid()
}

export function validateDay(date: Moment, day: number) {
  return date.day() === day
}

export function getDayName(date: Moment) {
  return date.format("dddd")
}

export function validateDayFromString(dateString: string, day: number, format: string = defaultDateFormat) {
  const parsed = moment(dateString, format)
  return parsed.day() === day
}

export function getNextDay(date: Moment, day: number) {
  return date.clone().day(7 + day)
}

export function calculateHourDifference(date: Moment, end: Moment) {
  const difference = date.diff(end, 'hours')
  return difference
}

export function calculateMinuteDifference(date: Moment, end: Moment) {
  const difference = date.diff(end, 'minutes')
  return difference
}

export function calculateWeekDifferenceFromToday(weeks: number): Date {
  const date = moment().subtract(weeks, "weeks")
  return date.toDate()
}

export function calculateWeeksFromDate(startDate: string | Date): number {
  const start = moment(startDate)
  // Validar que la fecha sea válida
  if (!start.isValid()) {
    throw new Error("La fecha proporcionada no es válida.");
  }
  // Obtener la diferencia en semanas
  const now = moment();
  const weeks = now.diff(start, "weeks");

  return weeks;
}