import boxProductionService from "@services/box-production.service";
import { customLog } from "@app/utils/util.util";
import { updateAdministrativeWeek } from "@app/utils/week.util";
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

function automaticSync() {
  const syncInterval = process.env.SYNC_INTERVAL ? Number(process.env.SYNC_INTERVAL) : 5;
  const startHour = process.env.SYNC_START_HOUR ? Number(process.env.SYNC_START_HOUR) : 6;
  const endHour = process.env.SYNC_END_HOUR ? Number(process.env.SYNC_END_HOUR) : 18;
  const timezone = process.env.SYNC_TIMEZONE || 'America/Mexico_City';

  if (isNaN(syncInterval) || isNaN(startHour) || isNaN(endHour)) {
    customLog("❌ Error en configuración. Verifica tus variables .env");
    return;
  }

  const cronExpression = `*/${syncInterval} ${startHour}-${endHour} * * *`;
  customLog(`✅ Sincronización automática configurada para ejecutarse cada ${syncInterval} minutos de ${startHour}:00 a ${endHour}:00 (${timezone})`);
  customLog(`🕒 Expresión de cron utilizada para sincronización automática: ${cronExpression}`);

  // 🔄 Sincronización automática cada X minutos entre las horas configuradas
  cron.schedule(cronExpression, async () => {
    const currentTime = new Date().toLocaleTimeString();
    customLog(`🔄 [${currentTime}] Iniciando sincronización automática de códigos...`);

    try {
      const result = await boxProductionService.synchronize();

      if (result && result.upsertedCount !== undefined) {
        customLog(`✅ [${currentTime}] Sincronización automática completada: ${result.upsertedCount} códigos añadidos o actualizados.`);
      } else {
        customLog(`⚠️ [${currentTime}] Sincronización automática completada pero no se detectaron cambios.`);
      }

    } catch (error) {
      customLog(`❌ [${currentTime}] Error en la sincronización automática: ${String(error)}`);
    }
  }, {
    timezone: timezone
  });

  // 🔄 Actualización automática de la semana administrativa (cada martes a la medianoche)
  cron.schedule("0 0 * * 2", async () => {
    customLog("📌 Actualizando semana administrativa...");

    try {
      await updateAdministrativeWeek();
      customLog("✅ Semana administrativa actualizada exitosamente.");

      // 🔄 Iniciar la actualización de los `weeklyRecords` después de actualizar la semana administrativa.
      await boxProductionService.updateAllWeeklyRecords();
      customLog("✅ weeklyRecords actualizados exitosamente para todas las casetas.");

    } catch (error) {
      customLog(`❌ Error al actualizar la semana administrativa o weeklyRecords: ${String(error)}`);
    }
  }, {
    timezone: timezone
  });

  customLog("✅ Crons automáticos configurados correctamente.");
}

export default automaticSync;
