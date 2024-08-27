import { CronJob } from 'cron'
import { customLog } from '@app/utils/util.util'
import absenceService from '../services/absence.service'
import payrollService from '../services/payroll.service'
import { AppMongooseRepo } from '@app/repositories/mongoose'

class CronjobControlller {
  async generateDailyAbsences (date: Date): Promise<void> {
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      customLog('Ejecutando Cron generateDailyAbsences')
      await absenceService.generateDailyAbsences({date}, session)
      await session.commitTransaction()
      await session.endSession()
    } catch (e) {
      await session.abortTransaction()
      console.log(String(e))
    }
  }

  async executeWeeklyPayroll (): Promise<void> {
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      customLog('Ejecutando Cron executeWeeklyPayroll')
      await payrollService.executeWeeklyPayroll()
      await session.commitTransaction()
      await session.endSession()
    } catch (e) {
      await session.abortTransaction()
      console.log(String(e))
    }
  }
}

export const controller = new CronjobControlller()

// export const appTiempoRetencion = new CronJob('*/5 * * * * *', controller.deleteSensitiveData)
// export const dailyAbsencesCronJob = new CronJob('0 11 01 Jan,Apr,Jul,Oct *', controller.generateDailyAbsences)

export const dailyAbsencesCronJob = new CronJob('0 18 * * *', async () => {
  const today = new Date();
  await controller.generateDailyAbsences(today);
});

export const dailyPayrollCronJob = new CronJob('0 18 * * *', async () => {
  await controller.executeWeeklyPayroll();
});