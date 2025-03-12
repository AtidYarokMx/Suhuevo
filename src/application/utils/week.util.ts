import { ConfigurationModel } from "@app/repositories/mongoose/models/configuration.model";
import moment from "moment";

/**
 * Obtiene la semana administrativa actual desde la base de datos.
 * Si no existe, la genera y la guarda.
 */
export async function getCurrentWeekRange(): Promise<{ weekStart: Date; weekEnd: Date }> {
  let config = await ConfigurationModel.findById("weekAdmin").lean().exec();

  if (!config) {
    // Si no existe, calcular y guardar la semana correctamente.
    config = await updateAdministrativeWeek();
  }

  return { weekStart: config.currentWeekStart, weekEnd: config.currentWeekEnd };
}

/**
 * **Actualiza la semana administrativa para iniciar los miércoles a las 00:00 AM en UTC.**
 */
export async function updateAdministrativeWeek() {
  const currentDate = moment.utc();
  const weekday = currentDate.isoWeekday(); // Monday=1, ..., Sunday=7

  // 🔹 Ajuste para iniciar el miércoles a las 00:00 AM UTC
  let weekStart = weekday >= 3
    ? currentDate.clone().subtract(weekday - 3, "days").startOf("day").utc().toDate() // Miércoles de la semana actual
    : currentDate.clone().subtract(weekday + 4, "days").startOf("day").utc().toDate(); // Miércoles de la semana anterior

  let weekEnd = moment.utc(weekStart).add(6, "days").endOf("day").toDate(); // Martes 23:59:59 UTC

  console.log(`🟢 Nueva semana administrativa: ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);

  return await ConfigurationModel.findOneAndUpdate(
    { _id: "weekAdmin" },
    { currentWeekStart: weekStart, currentWeekEnd: weekEnd, lastUpdated: new Date() },
    { upsert: true, new: true, returnDocument: "after" }
  ).lean().exec();
}
