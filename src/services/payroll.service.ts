/* lib */
import moment from "moment";
import * as ExcelJS from 'exceljs'
/* app models */
import { AppErrorResponse } from "@app/models/app.response";
/* models */
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { PayrollModel } from "@app/repositories/mongoose/models/payroll.model";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { OvertimeModel } from "@app/repositories/mongoose/models/overtime.model";
import { PersonalBonusModel } from "@app/repositories/mongoose/models/personal-bonus.model";
/* services */
import employeeService from "./employee.service";
import departmentService from "./department.service";
import jobService from "./job.service";
/* utils */
import { bigMath } from "@app/utils/math.util";
import { formatParse, getNextDay } from "@app/utils/date.util";
import { consumeSequence } from "@app/utils/sequence";
import { formatDate, getNextTuesday, groupBy, sumField } from "@app/utils/util.util";
import { asyncGroupBy } from "@app/utils/array.util";
/* dtos */
import { IPayroll, SchemaGenerateWeeklyPayroll } from "@app/dtos/payroll.dto";
import { BonusType, IBonus } from "@app/dtos/bonus.dto";
import { IPersonalBonus, PersonalBonusEntityType } from "@app/dtos/personal-bonus.dto";
import { EEmployeStatus, IEmployee } from "@app/dtos/employee.dto";
import { BonusModel } from "@app/repositories/mongoose/models/bonus.model";
/* types */
import type { ClientSession } from "mongoose";

class PayrollService {
  private readonly daysOfWeekInSpanish = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  private readonly holidayList = ['24-01-01', '24-08-01', '24-12-25', '24-12-31'];
  private readonly paymentDay = 5 // Viernes
  private readonly weekStartDay = 3 // Miercoles
  private readonly weekCutOffDay = 2 // Martes

  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query
    const allowedFields: (keyof IPayroll)[] = ['id', 'name', 'startDate', 'cutoffDate']
    const filter: any = { active: true }
    const selection: any = size === 'small' ? {} : { active: 0, _id: 0, __v: 0 }

    for (const field in queryFields) {
      if (!(allowedFields as any[]).includes(field.replace(/[~<>]/, ''))) {
        throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` })
      }

      const value = queryFields[field]
      const cleanField = field.replace(/[~<>]/, '')
      if (Array.isArray(value)) {
        filter[cleanField] = { $in: value }
      } else if (field.startsWith('~')) {
        filter[cleanField] = new RegExp('' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      } else if (field.startsWith('<')) {
        filter[cleanField] = { ...filter[cleanField], $lt: value }
      } else if (field.startsWith('>')) {
        filter[cleanField] = { ...filter[cleanField], $gt: value }
      } else {
        filter[cleanField] = value
      }
    }

    const records = await PayrollModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' })
    if (records.length === 0) return []
    return this.populateResults(records)
  }

  async populateResults(array: IPayroll[]): Promise<any> {
    const populatedArray = JSON.parse(JSON.stringify(array))
    for (const record of populatedArray) {
      record.totalAmount = record.lines.reduce((sum: number, line: any) => sum + line.netPay, 0);
    }

    return populatedArray
  }

  /**
   * Genera la nómina semanal (versión preliminar o preview) y calcula el pago de cada empleado.
   * Se incluye la consideración de las faltas justificadas como días trabajados.
   */

  async generateWeeklyPayroll(body: SchemaGenerateWeeklyPayroll, session: ClientSession) {
    // Se asume que la fecha viene validada (siempre miércoles)
    const weekStartDate = formatParse(body.weekStartDate)
    const weekCutOffDate = getNextDay(weekStartDate, 2)
    const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD')
    const formattedWeekCutoffDate = weekCutOffDate.format('YYYY-MM-DD')

    // Consultas de registros dentro del periodo
    const attendances = await AttendanceModel.find(
      { active: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
      null,
      { session }
    ).exec()
    // Se obtienen las faltas **no justificadas** (para efectos de penalización)
    const absences = await AbsenceModel.find(
      { active: true, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
      null,
      { session }
    ).exec()

    // Faltas que son pagadas (no penalizadas)
    const paidAbsences = await AbsenceModel.find(
      { active: true, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
      null,
      { session }
    ).exec()

    // **Faltas justificadas**: ahora se cuentan como días trabajados
    const justifiedAbsences = await AbsenceModel.find(
      { active: true, isJustified: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
      null,
      { session }
    ).exec();

    const overtimeRecords = await OvertimeModel.find(
      { active: true, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate } },
      null,
      { session }
    ).exec()

    // Agrupamos los registros por empleado
    const attendancesByEmployee = groupBy(attendances, 'employeeId')
    const absencesByEmployee = groupBy(absences, 'employeeId')
    const paidAbsencesByEmployee = groupBy(paidAbsences, 'employeeId')
    const justifiedAbsencesByEmployee = groupBy(justifiedAbsences, 'employeeId');
    const overtimeRecordsByEmployee = groupBy(overtimeRecords, 'employeeId')

    // se calcula el proporcional de los esquemas de trabajo
    const fiveDaysSchemeBase = bigMath.chain(2).divide(5).done() // 0.4
    const sixDaysSchemeBase = bigMath.chain(1).divide(6).done() // 0.16666666666666666

    // catálogos de bonus generales
    const bonusOvertime = await BonusModel.findOne({ active: true, inputId: 'horas_extra', enabled: true }).exec()
    const bonusAttendance = await BonusModel.findOne({ active: true, inputId: 'asistencia', enabled: true }).exec()
    const bonusPunctuality = await BonusModel.findOne({ active: true, inputId: 'puntualidad', enabled: true }).exec()
    const bonusGrocery = await BonusModel.findOne({ active: true, inputId: 'despensa', enabled: true }).exec()

    // bonus personales que sobreescriben el bono general
    const personalBonusOvertime = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusOvertime?._id, enabled: true })
    const personalBonusAttendance = await PersonalBonusModel.find({ active: true, entityType: PersonalBonusEntityType.GENERAL, entityId: bonusAttendance?._id, enabled: true }).exec()
    const personalBonusPunctuality = await PersonalBonusModel.find({ active: true, entityType: PersonalBonusEntityType.GENERAL, entityId: bonusPunctuality?._id, enabled: true }).exec()
    const personalBonusGrocery = await PersonalBonusModel.find({ active: true, entityType: PersonalBonusEntityType.GENERAL, entityId: bonusGrocery?._id, enabled: true }).exec()
    // other bonuses
    const customPersonalBonus = await PersonalBonusModel.find({ active: true, entityType: 'catalog-personal-bonus', enabled: true })

    // Listado de empleados activos
    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }, null, { session })
      .populate(["job", "department"]).exec();

    // Se calcula la nómina de cada empleado
    const lines = await Promise.all(employees.map(async (employee, index) => {
      const { dailySalary, jobScheme } = employee

      // Se obtienen los registros individuales para cada empleado
      const employeeAttendances = await AttendanceModel.find(
        { active: true, employeeId: employee.id, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
        null,
        { session }
      ).exec()

      const employeePaidAbsences = await AbsenceModel.find(
        { active: true, employeeId: employee.id, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
        null,
        { session }
      ).exec()

      const employeeJustifiedAbsences = await AbsenceModel.find(
        { active: true, employeeId: employee.id, isJustified: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
        null,
        { session }
      ).exec();

      const employeeOvertimeRecords = await OvertimeModel.find(
        { active: true, employeeId: employee.id, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate } },
        null,
        { session }
      ).exec()

      // retardos (?)
      const employeeTardies = employeeAttendances.filter(item => item.isLate);

      // Se consideran días trabajados: asistencias + ausencias pagadas + faltas justificadas
      const daysWorked = employeeAttendances.length + employeePaidAbsences.length + employeeJustifiedAbsences.length;
      const restDaysMultiplier = jobScheme === '5' ? fiveDaysSchemeBase : sixDaysSchemeBase;
      const paidRestDays = bigMath.multiply(daysWorked, restDaysMultiplier);
      const totalDays = daysWorked + paidRestDays;
      const salary = dailySalary * totalDays;

      let taxableBonuses = 0;

      // Cálculo de horas extra
      const extraHours = Number(sumField(employeeOvertimeRecords, 'hours').toFixed(2));
      const employeeBonusOvertime = personalBonusOvertime.find(x => x.idEmployee === employee._id) ?? bonusOvertime;
      const extraHoursPayment = extraHours * (employeeBonusOvertime?.value ?? 0);
      if (employeeBonusOvertime?.taxable) {
        taxableBonuses += extraHoursPayment;
      }

      // Bono de asistencia: solo se otorga si no hay ausencias injustificadas
      const employeeAbsencesUnjustified = await AbsenceModel.find(
        { active: true, employeeId: employee.id, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } },
        null,
        { session }
      ).exec();
      const attendanceBonus = employeeAbsencesUnjustified.length > 0
        ? 0
        : this.evaluateBonus(personalBonusAttendance.find(x => x.idEmployee === employee._id) ?? bonusAttendance, salary);
      if ((personalBonusAttendance.find(x => x.idEmployee === employee._id) ?? bonusAttendance)?.taxable) {
        taxableBonuses += attendanceBonus;
      }

      // Bono de puntualidad
      const punctualityBonus = employeeTardies.length >= 2
        ? 0
        : this.evaluateBonus(personalBonusPunctuality.find(x => x.idEmployee === employee._id) ?? bonusPunctuality, salary);
      if ((personalBonusPunctuality.find(x => x.idEmployee === employee._id) ?? bonusPunctuality)?.taxable) {
        taxableBonuses += punctualityBonus;
      }

      // Bono de despensa
      const groceryBonus = this.evaluateBonus(personalBonusGrocery.find(x => x.idEmployee === employee._id) ?? bonusGrocery, salary);
      if ((personalBonusGrocery.find(x => x.idEmployee === employee._id) ?? bonusGrocery)?.taxable) {
        taxableBonuses += groceryBonus;
      }

      // Bono por día festivo (calculado a partir de las ausencias injustificadas, según lógica de negocio)
      const holidayBonus = employeeAbsencesUnjustified.reduce((prev, curr) => prev + dailySalary * curr.paidValue, 0);

      // Otros bonos personalizados
      const employeeCustomBonuses = customPersonalBonus.filter(x => x.idEmployee === employee._id);
      const customBonusesAmounts = employeeCustomBonuses.map(x => ({
        amount: this.evaluateBonus(x, salary),
        taxable: x.taxable
      }));
      const customBonusesTotal = sumField(customBonusesAmounts, 'amount');

      const taxPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + taxableBonuses +
        sumField(customBonusesAmounts.filter(x => x.taxable), 'amount');
      const netPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + taxableBonuses + customBonusesTotal;

      return {
        rowIndex: index + 1,
        employeeId: employee.id,
        employeeName: employee.fullname(),
        jobId: employee.jobId,
        jobName: employee.job?.name ?? null,
        departmentId: employee.departmentId,
        departmentName: employee.department?.name ?? null,
        dailySalary: employee.dailySalary,
        daysWorked,
        paidRestDays,
        totalDays,
        salary,
        extraHours,
        extraHoursPayment,
        punctualityBonus,
        attendanceBonus,
        groceryBonus,
        holidayBonus,
        customBonusesTotal,
        tardies: employeeTardies.length,
        taxPay,
        netPay,
        jobScheme
      };
    }));

    // Solo para preview, no se guarda la nómina
    console.log(lines);
  }
  // -------------------------------------------------------------

  /**
   * Ejecuta (finaliza) la nómina semanal, validando la fecha y guardando los registros.
   * Se incluye el conteo de faltas justificadas como días trabajados.
   */

  async executeWeeklyPayroll(body: any, session: ClientSession): Promise<any> {
    let weekStartDate: any = body.weekStartDate
    if (weekStartDate == null || isNaN(new Date(weekStartDate).getTime()))
      throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });
    weekStartDate = new Date(weekStartDate);

    // Se le suman las horas UTC del servidor ya que por defecto viene como las 00:00 UTC 0, para que sea interpretado como las 00:00 UTC-6
    weekStartDate = new Date(weekStartDate.getTime() + (weekStartDate.getTimezoneOffset() * 60000));

    if (weekStartDate.getDay() !== this.weekStartDay) {
      const dayName = this.daysOfWeekInSpanish[this.weekStartDay];
      throw new AppErrorResponse({ statusCode: 400, name: `La fecha de inicio de semana debe ser un ${dayName}` });
    }

    const weekCutoffDate = getNextTuesday(weekStartDate);
    console.log(weekStartDate, weekStartDate.getDay(), this.daysOfWeekInSpanish[weekStartDate.getDay()])
    console.log(weekCutoffDate, weekCutoffDate.getDay(), this.daysOfWeekInSpanish[weekCutoffDate.getDay()])
    const formattedWeekStartDate = moment(weekStartDate).format('YYYY-MM-DD')
    const formattedWeekCutoffDate = moment(weekCutoffDate).format('YYYY-MM-DD')
    console.log(formattedWeekStartDate, formattedWeekCutoffDate)

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }).populate(["job", "department"]).exec();
    const lines = [];

    // Obtener las asistencias, faltas y tiempo extra entre las fechas de corte e inicio de semana
    const attendances = await AttendanceModel.find({ active: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });
    const absences = await AbsenceModel.find({ active: true, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });
    const paidAbsences = await AbsenceModel.find({ active: true, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });
    const justifiedAbsences = await AbsenceModel.find({ active: true, isJustified: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });
    const overtimeRecords = await OvertimeModel.find({ active: true, startTime: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });


    const attendancesByEmployee = groupBy(attendances, 'employeeId');
    const absencesByEmployee = groupBy(absences, 'employeeId');
    const paidAbsencesByEmployee = groupBy(paidAbsences, 'employeeId');
    const justifiedAbsencesByEmployee = groupBy(justifiedAbsences, 'employeeId');
    const overtimeRecordsByEmployee = groupBy(overtimeRecords, 'employeeId');

    const fiveDaysSchemeBase = bigMath.chain(2).divide(5).done()
    const sixDaysSchemeBase = bigMath.chain(1).divide(6).done()

    // General Bonus
    const bonusOvertime = await BonusModel.findOne({ active: true, inputId: 'horas_extra', enabled: true })
    const bonusAttendance = await BonusModel.findOne({ active: true, inputId: 'asistencia', enabled: true })
    const bonusPunctuality = await BonusModel.findOne({ active: true, inputId: 'puntualidad', enabled: true })
    const bonusGrocery = await BonusModel.findOne({ active: true, inputId: 'despensa', enabled: true })

    console.log('bonusOvertime', bonusOvertime)
    console.log('bonusAttendance', bonusAttendance)
    console.log('bonusPunctuality', bonusPunctuality)
    console.log('bonusGrocery', bonusGrocery)

    // Personal bonus that overrides general bonus
    const personalBonusOvertime = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusOvertime?._id, enabled: true }).exec();
    const personalBonusAttendance = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusAttendance?._id, enabled: true }).exec();
    const personalBonusPunctuality = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusPunctuality?._id, enabled: true }).exec();
    const personalBonusGrocery = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusGrocery?._id, enabled: true }).exec();
    const customPersonalBonus = await PersonalBonusModel.find({ active: true, entityType: 'catalog-personal-bonus', enabled: true });


    console.log('personalBonusOvertime', personalBonusOvertime)
    console.log('personalBonusAttendance', personalBonusAttendance)
    console.log('personalBonusPunctuality', personalBonusPunctuality)
    console.log('personalBonusGrocery', personalBonusGrocery)

    for (const [index, employee] of employees.entries()) {
      const dailySalary = employee.dailySalary
      const jobScheme = employee.jobScheme

      const employeeAttendances = attendancesByEmployee[employee.id] || [];
      const employeeAbsences = absencesByEmployee[employee.id] || [];
      const employeePaidAbsences = paidAbsencesByEmployee[employee.id] || [];
      const employeeJustifiedAbsences = justifiedAbsencesByEmployee[employee.id] || [];
      const employeeOvertimeRecords = overtimeRecordsByEmployee[employee.id] || [];
      const employeeTardies = employeeAttendances.filter(x => x.isLate);

      // Se consideran asistencias, ausencias pagadas y faltas justificadas como días trabajados
      const daysWorked = employeeAttendances.length + employeePaidAbsences.length + employeeJustifiedAbsences.length;
      const restDaysMultiplier = jobScheme === '5' ? fiveDaysSchemeBase : sixDaysSchemeBase;
      const paidRestDays = bigMath.multiply(daysWorked, restDaysMultiplier);
      const totalDays = daysWorked + paidRestDays;
      const salary = dailySalary * totalDays;

      const employeeBonusOvertime = personalBonusOvertime.find(x => x.idEmployee === employee._id) ?? bonusOvertime;
      const extraHours = Number(sumField(employeeOvertimeRecords, 'hours').toFixed(2));
      const extraHoursPayment = extraHours * (employeeBonusOvertime?.value ?? 0);
      let taxableBonuses = 0;
      if (employeeBonusOvertime?.taxable) {
        taxableBonuses += extraHoursPayment;
      }

      const employeeBonusAttendance = personalBonusAttendance.find(x => x.idEmployee === employee._id) ?? bonusAttendance;
      const attendanceBonus = employeeAbsences.length > 0 ? 0 : this.evaluateBonus(employeeBonusAttendance, salary);
      if (employeeBonusAttendance?.taxable) {
        taxableBonuses += attendanceBonus;
      }

      const employeeBonusPunctuality = personalBonusPunctuality.find(x => x.idEmployee === employee._id) ?? bonusPunctuality;
      const punctualityBonus = employeeTardies.length >= 2 ? 0 : this.evaluateBonus(employeeBonusPunctuality, salary);
      if (employeeBonusPunctuality?.taxable) {
        taxableBonuses += punctualityBonus;
      }

      const employeeBonusGrocery = personalBonusGrocery.find(x => x.idEmployee === employee._id) ?? bonusGrocery;
      const groceryBonus = this.evaluateBonus(employeeBonusGrocery, salary);
      if (employeeBonusGrocery?.taxable) {
        taxableBonuses += groceryBonus;
      }

      const holidayBonus = employeeAbsences.reduce((prev, curr) => prev + dailySalary * curr.paidValue, 0);

      const employeeCustomBonuses = customPersonalBonus.filter(x => x.idEmployee === employee._id);
      const customBonusesAmounts = employeeCustomBonuses.map(x => ({ amount: this.evaluateBonus(x, salary), taxable: x.taxable }));
      const customBonusesTotal = sumField(customBonusesAmounts, 'amount');

      const taxPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + taxableBonuses +
        sumField(customBonusesAmounts.filter(x => x.taxable), 'amount');
      const netPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + taxableBonuses + customBonusesTotal;

      lines.push({
        rowIndex: index + 1,
        employeeId: employee.id,
        employeeName: employee.fullname(),
        jobId: employee.jobId,
        jobName: employee.job?.name ?? null,
        departmentId: employee.departmentId,
        departmentName: employee.department?.name ?? null,

        dailySalary: employee.dailySalary,
        daysWorked,
        paidRestDays,
        totalDays,
        salary,
        extraHours,
        extraHoursPayment,

        punctualityBonus,
        attendanceBonus,
        groceryBonus,
        holidayBonus,
        customBonusesTotal,

        tardies: employeeTardies.length,

        taxPay,
        netPay,

        jobScheme
      });
    }

    if (body.preview != null)
      return { lines, startDate: weekStartDate, cutoffDate: weekCutoffDate };

    let record = await PayrollModel.findOne({ active: true, startDate: formattedWeekStartDate });
    if (record) {
      record.lines = lines;
      record.name = `Nómina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`;
    } else {
      record = new PayrollModel({
        id: 'PR' + String(await consumeSequence('payrolls', session)).padStart(8, '0'),
        name: `Nómina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`,
        lines,
        startDate: formattedWeekStartDate,
        cutoffDate: formattedWeekCutoffDate,
      });
    }

    await record.save({ session });
    return record;
  }

  /**
   * Calcula el monto de un bono según su tipo (monto fijo o porcentaje sobre el salario base).
   */

  evaluateBonus(bonus: IBonus | IPersonalBonus | null, salary: number): number {
    if (!bonus || bonus.value == null) return 0;
    if (bonus.type === BonusType.AMOUNT) return bonus.value;
    if (bonus.type === BonusType.PERCENT) return (bonus.value / 100) * salary;
    return 0;
  }

  /**
   * Generates an Excel report for the payroll.
   *
   * @param {any} query - The query object containing the payroll ID.
   * @returns {Promise<{ file: Buffer, fileName: string }>} - The generated Excel file buffer and file name.
   * @throws {AppErrorResponse} - Throws an error if the payroll ID is not provided or the payroll is not found.
   */
  async excelReport(query: any) {
    const payrollId = query.id;
    if (payrollId == null) throw new AppErrorResponse({ statusCode: 400, name: 'El id es requerido' });
    const payroll = await PayrollModel.findOne({ active: true, id: payrollId });
    if (payroll == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el pago de nómina' });
    const employeeIds = payroll.lines.map(x => x.employeeId);
    const employees = await employeeService.get({ ids: employeeIds });
    const departmentIds = [...new Set(payroll.lines.map(x => x.departmentId))];
    const departments = await departmentService.get({ ids: departmentIds });
    const jobIds = [...new Set(payroll.lines.map(x => x.jobId))];
    const jobs = await jobService.get({ ids: jobIds });
    const rowsArray = payroll.lines.map((line: any) => {
      const employee: IEmployee = employees[line.employeeId];
      return {
        date: payroll.cutoffDate,
        jobName: jobs[line.jobId]?.name ?? '',
        mxCurp: employee.mxCurp,
        mxNss: employee.mxNss,
        employeeName: `${employee.name} ${employee.lastName ?? ''} ${employee.secondLastName ?? ''}`,
        sdi: '',
        dailySalary: line.dailySalary,
        daysWorked: line.daysWorked,
        paidRestDays: line.paidRestDays,
        totalDays: line.totalDays,
        salary: line.salary,
        extraHours: line.extraHours,
        extraHoursPayment: line.extraHoursPayment,
        punctualityBonus: line.punctualityBonus,
        attendanceBonus: line.attendanceBonus,
        groceryBonus: line.groceryBonus,
        holidayBonus: line.holidayBonus,
        customBonusesTotal: line.customBonusesTotal,
        netPay: line.netPay,
        taxPay: line.taxPay,
        jobScheme: line.jobScheme,
        departmentId: line.departmentId,
      }
    });

    const rowsByDepartment = rowsArray.reduce((acc: any, row: any) => { // Group rows by department
      const departmentId = row.departmentId;
      const departmentName = departments[departmentId]?.name
      if (departmentName) {
        if (!acc[departmentName]) {
          acc[departmentName] = [];
        }
        acc[departmentName].push(row);
      } else {
        if (!acc['Sin Departamento']) {
          acc['Sin Departamento'] = [];
        }
        acc['Sin Departamento'].push(row);
      }
      return acc;
    }, {});

    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook() // Create a new workbook

    const borderStyle: Partial<ExcelJS.Borders> = { // Define border style
      top: { style: 'thin', color: { argb: 'aaaaaa' } },
      left: { style: 'thin', color: { argb: 'aaaaaa' } },
      bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
      right: { style: 'thin', color: { argb: 'aaaaaa' } }
    }

    const headerStyle: ExcelJS.FillPattern = { // Define header style
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'dce6f1' }
    }

    for (const [departmentName, rowArray] of Object.entries(rowsByDepartment)) { // Iterate over departments
      const worksheet = workbook.addWorksheet(departmentName, { // Add worksheet for each department
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      worksheet.columns = [
        { header: 'Nómina', key: 'date', width: 20, style: { numFmt: 'DD/MM/YYYY' } },
        { header: 'Puesto', key: 'jobName', width: 15, style: { numFmt: '@' } },
        { header: 'CURP', key: 'mxCurp', width: 20, style: { numFmt: '@' } },
        { header: 'Número de seguro social', key: 'mxNss', width: 20, style: { numFmt: '@' } },
        { header: 'Nombre del empleado', key: 'employeeName', width: 30, style: { numFmt: '@' } },
        { header: 'S.D.I', key: 'sdi', width: 10, style: { numFmt: '@' } },
        { header: 'Salario Diario', key: 'dailySalary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Días Trabajados', key: 'daysWorked', width: 11, style: { numFmt: '@' } },
        { header: 'Parte Proporcional Sab y Dom', key: 'paidRestDays', width: 20, style: { numFmt: '@' } },
        { header: 'Días a Pagar', key: 'totalDays', width: 10, style: { numFmt: '@' } },
        { header: 'Sueldo del Periodo', key: 'salary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Horas Extra', key: 'extraHours', width: 10, style: { numFmt: '@' } },
        { header: 'Valor Horas Extra', key: 'extraHoursPayment', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Premio de puntualidad', key: 'punctualityBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Bono de Asistencia', key: 'attendanceBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Despensa', key: 'groceryBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Día festivo', key: 'holidayBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Otros bonos', key: 'customBonusesTotal', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Base Gravable', key: 'taxPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Total a pagar', key: 'netPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
      ];

      // Headers 1
      const headerRow = worksheet.getRow(1) // Get header row
      headerRow.eachCell((cell: any) => { cell.fill = headerStyle }) // Apply header style
      headerRow.eachCell((cell: any) => { cell.border = borderStyle }) // Apply border style
      headerRow.eachCell((cell: any) => { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } }) // Apply alignment
      headerRow.font = { bold: true }; // Set font to bold

      // Solo agregar las propiedades que coinciden con las columnas definidas
      (rowArray as any).forEach((row: any) => {
        const filteredRow = worksheet.columns.reduce((acc: any, col: any) => {
          if (col.key in row) acc[col.key] = row[col.key];
          return acc;
        }, {});
        worksheet.addRow(filteredRow);
      });

      const totalsRow = worksheet.addRow([ // Add totals row
        'Totales', '', '', '', '', '', '', '', '',
        { formula: `SUM(J2:J${worksheet.rowCount})` }, // Total daysWorked
        { formula: `SUM(K2:K${worksheet.rowCount})` }, // Total salary 
        { formula: `SUM(L2:L${worksheet.rowCount})` }, // Total extraHours
        { formula: `SUM(M2:M${worksheet.rowCount})` }, // Total extraHoursPayment
        { formula: `SUM(N2:N${worksheet.rowCount})` }, // Total punctualityBonus
        { formula: `SUM(O2:O${worksheet.rowCount})` }, // Total attendanceBonus
        { formula: `SUM(P2:P${worksheet.rowCount})` }, // Total groceryBonus
        { formula: `SUM(Q2:Q${worksheet.rowCount})` }, // Total holidayBonus
        { formula: `SUM(R2:R${worksheet.rowCount})` }, // Total customBonusesTotal
        { formula: `SUM(S2:S${worksheet.rowCount})` }, // Total taxPay
        { formula: `SUM(T2:T${worksheet.rowCount})` }, // Total netPay
      ]);

      totalsRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'thick', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: 'aaaaaa' } },
          bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
          right: { style: 'thin', color: { argb: 'aaaaaa' } }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // Pestaña de resumen
    const summaryData = Object.keys(rowsByDepartment).map(departmentName => { // Create summary data
      const rows = rowsByDepartment[departmentName];
      const totalEmployees = rows.length;
      const totalAmount = rows.reduce((sum: number, row: any) => sum + row.netPay, 0);
      return { departmentName, totalEmployees, totalAmount };
    });

    const summarySheet = workbook.addWorksheet('Resumen'); // Add summary sheet
    summarySheet.columns = [ // Define summary sheet columns
      { header: 'Departamento', key: 'departmentName', width: 20 },
      { header: 'Empleados', key: 'totalEmployees', width: 15 },
      { header: 'Cantidad a Pagar', key: 'totalAmount', width: 20, style: { numFmt: '"$"#,##0.00' } },
    ];

    const headerRowSummary = summarySheet.getRow(1);
    headerRowSummary.eachCell((cell: any) => {
      cell.fill = headerStyle;
      cell.border = borderStyle;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRowSummary.font = { bold: true };

    summaryData.forEach((row: any) => {
      summarySheet.addRow(row);
    });

    summarySheet.addRow({
      departmentName: 'TOTAL =',
      totalEmployees: { formula: `SUM(B2:B${summarySheet.rowCount})` },
      totalAmount: { formula: `SUM(C2:C${summarySheet.rowCount})` }
    }).font = { bold: true };

    const totalRow = summarySheet.lastRow;
    totalRow?.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' },
      };
    });

    const excelBuffer = await workbook.xlsx.writeBuffer();
    return { file: excelBuffer, fileName: `${payroll.name}.xlsx` };
  }
}

const payrollService: PayrollService = new PayrollService();
export default payrollService;
