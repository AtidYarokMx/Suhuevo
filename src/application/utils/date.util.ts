import moment from "moment";

export function parse(stringDate: string) {
  return moment(stringDate, "M/D/YYYY H:m")
}

export function validateYear(year: string) {
  return moment(year, "YYYY", true).isValid()
}