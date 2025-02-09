// utils/date.util.ts
import moment, { Moment } from "moment";

export const defaultDateFormat = "YYYY-MM-DD";

/**
 * Parsea una cadena de fecha usando el formato dado (o el formato por defecto).
 * @param dateString - La cadena a parsear.
 * @param format - El formato a utilizar (por defecto: YYYY-MM-DD).
 * @returns Un objeto Moment representando la fecha.
 */
export function formatParse(dateString: string, format: string = defaultDateFormat): Moment {
  return moment(dateString, format);
}

/**
 * Parsea una fecha en formato "M/D/YYYY H:m".
 * @param dateString - La cadena de fecha.
 * @returns Un objeto Moment.
 */
export function parse(dateString: string): Moment {
  return moment(dateString, "M/D/YYYY H:m");
}

/**
 * Valida si una cadena representa un año válido (formato "YYYY").
 * @param year - La cadena que representa el año.
 * @returns true si es válido, false en caso contrario.
 */
export function validateYear(year: string): boolean {
  return moment(year, "YYYY", true).isValid();
}

/**
 * Valida que el día de la semana de una fecha (Moment) sea igual al valor dado.
 * @param date - Objeto Moment.
 * @param day - Día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado).
 * @returns true si coinciden, false en caso contrario.
 */
export function validateDay(date: Moment, day: number): boolean {
  return date.day() === day;
}

/**
 * Obtiene el nombre del día de la semana de una fecha.
 * @param date - Objeto Moment.
 * @returns El nombre del día (por ejemplo, "Monday", "Tuesday", etc.).
 */
export function getDayName(date: Moment): string {
  return date.format("dddd");
}

/**
 * Valida que la fecha parseada de una cadena tenga un día específico.
 * @param dateString - La cadena de fecha.
 * @param day - Día esperado (0 a 6).
 * @param format - Formato de la cadena (por defecto: YYYY-MM-DD).
 * @returns true si el día coincide, false en caso contrario.
 */
export function validateDayFromString(dateString: string, day: number, format: string = defaultDateFormat): boolean {
  const parsed = moment(dateString, format);
  return parsed.day() === day;
}

/**
 * Devuelve un nuevo objeto Moment que representa el próximo día (en la semana) igual al número dado.
 * Por ejemplo, getNextDay(moment(), 2) devuelve el próximo martes.
 * @param date - La fecha base.
 * @param day - Día de la semana deseado (0 = domingo, …, 6 = sábado).
 * @returns Un objeto Moment con la fecha del próximo día especificado.
 */
export function getNextDay(date: Moment, day: number): Moment {
  return date.clone().day(7 + day);
}

/**
 * Calcula la diferencia en horas entre dos fechas.
 * @param date - La fecha inicial.
 * @param end - La fecha final.
 * @returns La diferencia en horas (número entero).
 */
export function calculateHourDifference(date: Moment, end: Moment): number {
  return date.diff(end, "hours");
}

/**
 * Calcula la diferencia en minutos entre dos fechas.
 * @param date - La fecha inicial.
 * @param end - La fecha final.
 * @returns La diferencia en minutos (número entero).
 */
export function calculateMinuteDifference(date: Moment, end: Moment): number {
  return date.diff(end, "minutes");
}

/**
 * Calcula la fecha resultante de restar un número de semanas a la fecha actual.
 * @param weeks - Número de semanas a restar.
 * @returns Un objeto Date resultante.
 */
export function calculateWeekDifferenceFromToday(weeks: number): Date {
  return moment().subtract(weeks, "weeks").toDate();
}

/**
 * Calcula el número de semanas transcurridas desde una fecha de inicio hasta hoy.
 * @param startDate - La fecha de inicio (cadena o Date).
 * @returns El número de semanas transcurridas.
 * @throws Error si la fecha proporcionada no es válida.
 */
export function calculateWeeksFromDate(startDate: string | Date): number {
  const start = moment(startDate);
  if (!start.isValid()) {
    throw new Error("La fecha proporcionada no es válida.");
  }
  return moment().diff(start, "weeks");
}
