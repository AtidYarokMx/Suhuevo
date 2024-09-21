import moment from "moment";

export function parse(stringDate: string) {
  return moment(stringDate, "M/D/YYYY H:m")
}