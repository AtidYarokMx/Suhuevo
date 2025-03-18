import { updateAdministrativeWeek } from "@app/utils/week.util";
import cron from 'node-cron';

cron.schedule("0 0 * * 2", async () => {
  console.log("📌 Actualizando semana administrativa...");
  await updateAdministrativeWeek();
  console.log("✅ Semana administrativa actualizada.");
});
