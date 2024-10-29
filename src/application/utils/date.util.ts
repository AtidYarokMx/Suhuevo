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