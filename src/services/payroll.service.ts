import { EEmployeStatus } from "@app/dtos/employee.dto";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { formatDateToYYMMDD } from "@app/utils/util.util";
import { getLastTuesday, getLastWednesday } from '../application/utils/util.util';

class PayrollService {
  private readonly attendanceBonusPercentage = 0.1;
  private readonly punctualityBonusPercentage = 0.1;
  private readonly groceryBonus = 290.00;
  private readonly vacationBonusPercentage = 0.25;
  private readonly holidayList = ['240101', '241225', '241231'];
  private readonly paymentDay = 5

  async executeWeeklyPayroll(): Promise<void> {
    
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday

    // Verificar si es día de pago de nómina
    if (currentDay !== this.paymentDay && currentDay !== (this.paymentDay - 1)) return;
    if (currentDay === (this.paymentDay - 1)) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      if (!this.holidayList.includes(formatDateToYYMMDD(nextDate))) return;
    }

    const weekCutoffDate = getLastTuesday(currentDate); // (último martes antes de la fecha actual)
    const weekStartDate = getLastWednesday(weekCutoffDate); // (último miércoles antes del corte de semana)

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE });

    const payrollData = [];

    for (const employee of employees) {
      const dailySalary = employee.dailySalary;

      // Obtener las asistencias del empleado entre las fechas de corte y inicio de semana
      const attendances = await AttendanceModel.find({
        active: true,
        employeeId: employee.id,
        date: { $gte: weekStartDate, $lte: weekCutoffDate },
      });

      // Salario base por los días trabajados
      const daysWorked = attendances.length;
      let baseSalary = dailySalary * daysWorked;
      // Bono de asistencia (10% del salario base)
      const attendanceBonus = this.calculateAttendanceBonus(attendances, dailySalary);
      // Bono de puntualidad (10% del salario base)
      const punctualityBonus = this.calculatePunctualityBonus(attendances, dailySalary);
      // Bono de despensa ($290 MXN)
      const pantryBonus = this.groceryBonus;
      // Calcular el pago por descanso semanal
      const weeklyRestBonus = this.calculateWeeklyRestBonus(daysWorked, dailySalary);
      // Bono por día festivo (triple pago)
      const holidayBonus = this.calculateHolidayBonus(attendances, dailySalary);
      // Total de bonos
      const totalBonuses = attendanceBonus + punctualityBonus + pantryBonus + weeklyRestBonus + holidayBonus;
      // Calcular el neto a pagar
      const netPay = baseSalary + totalBonuses;
      // Contar retardos
      const tardies = attendances.filter(attendance => attendance.isLate).length;
      // Generar objeto con los datos de la nómina del empleado
      payrollData.push({
        employee: employee.name,
        jobPosition: employee.jobId,
        dailySalary,
        daysWorked,
        attendanceBonus,
        pantryBonus,
        holidayBonus,
        totalBonuses,
        tardies,
        netPay,
      });
    }

    console.log(payrollData);
  }

  calculateAttendanceBonus(attendances: any[], dailySalary: number): number {
    const hasUnjustifiedAbsences = attendances.some(attendance => attendance.unjustifiedAbsence);
    return hasUnjustifiedAbsences ? 0 : dailySalary * this.attendanceBonusPercentage;
  }

  calculatePunctualityBonus(attendances: any[], dailySalary: number): number {
    const tardies = attendances.filter(attendance => attendance.isLate);
    return tardies.length < 2 ? dailySalary * this.punctualityBonusPercentage : 0;
  }

  calculateWeeklyRestBonus(daysWorked: number, dailySalary: number): number {
    if (daysWorked >= 6) {
      return dailySalary; // Se paga un día extra si trabajó 6 días
    }
    return (daysWorked / 6) * dailySalary; // Pago proporcional si trabajó menos de 6 días
  }

  calculateHolidayBonus(attendances: any[], dailySalary: number): number {
    // Calcular el bono por día festivo (triple salario)
    const holidayAttendances = attendances.filter(attendance => this.holidayList.includes(formatDateToYYMMDD(attendance.date)));
    return holidayAttendances.length * dailySalary * 2; // Bono = 2 días extra (por triple pago)
  }

  notifyPayrollAdmin(attendances: any[]): void {
    const missingCheckIns = attendances.filter(attendance => !attendance.checkedIn);
    const missingCheckOuts = attendances.filter(attendance => !attendance.checkedOut);

    if (missingCheckIns.length || missingCheckOuts.length) {
      // Lógica para enviar notificación al administrador
      console.log("Notificación: Faltan registros de check-in o check-out.");
    }
  }
}

const payrollService: PayrollService = new PayrollService();
export default payrollService;
