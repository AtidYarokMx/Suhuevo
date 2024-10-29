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

  // private readonly attendanceBonusPercentage = 0.1; 
  // private readonly punctualityBonusPercentage = 0.1;
  // private readonly groceryBonus = 145.00;
  // private readonly vacationBonusPercentage = 0.25;
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

  async generateWeeklyPayroll(body: SchemaGenerateWeeklyPayroll, session: ClientSession) {
    // la fecha ya viene validada con que siempre venga en miércoles
    // revisar los dtos la validación en caso de tener que modificarse
    const weekStartDate = formatParse(body.weekStartDate) // parseo de fecha a momentjs
    const weekCutOffDate = getNextDay(weekStartDate, 2) // obtiene el siguiente día de la semana con momentjs
    // fechas formateadas a YYY-MM-DD en string
    const formattedWeekStartDate = weekStartDate.format('YYYY-MM-DD')
    const formattedWeekCutoffDate = weekCutOffDate.format('YYYY-MM-DD')
    // Obtener las asistencias, faltas y tiempo extra entre las fechas de corte e inicio de semana
    const attendances = await AttendanceModel.find({ active: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
    const absences = await AbsenceModel.find({ active: true, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
    const paidAbsences = await AbsenceModel.find({ active: true, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
    const overtimeRecords = await OvertimeModel.find({ active: true, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate } }, null, { session }).exec()
    // promesas para agrupar por employeeId
    const attendancesByEmployee = groupBy(attendances, 'employeeId')
    const absencesByEmployee = groupBy(absences, 'employeeId')
    const paidAbsencesByEmployee = groupBy(paidAbsences, 'employeeId')
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
    // listado de empleados
    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }, null, { session }).populate(["job", "department"]).exec();
    const lines = await Promise.all(employees.map(async (employee, index) => {
      const { dailySalary, jobScheme } = employee
      // asistencias, ausencias, ausencias pagadas y retardos por cada empleado
      const employeeAttendances = await AttendanceModel.find({ active: true, employeeId: employee.id, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
      const employeeAbsences = await AbsenceModel.find({ active: true, employeeId: employee.id, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
      const employeePaidAbsences = await AbsenceModel.find({ active: true, employeeId: employee.id, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } }, null, { session }).exec()
      const employeeOvertimeRecords = await OvertimeModel.find({ active: true, employeeId: employee.id, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate } }, null, { session }).exec()
      // retardos (?)
      const employeeTardies = employeeAttendances.filter((item) => item.isLate)
      // días trabajados = asistencias + ausencias pagadas
      const daysWorked = employeeAttendances.length + employeePaidAbsences.length
      /* bonus */
      console.log(employeeAttendances.length, employeePaidAbsences.length, daysWorked, employeeAbsences.length, employeeOvertimeRecords.length)
    }))
    console.log(lines)
  }
  // -------------------------------------------------------------

  async executeWeeklyPayroll(body: any, session: ClientSession): Promise<any> {
    let weekStartDate: any = body.weekStartDate // '2024-09-11T06:00:00.000Z'
    if (weekStartDate == null || isNaN(new Date(weekStartDate).getTime())) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });

    weekStartDate = new Date(weekStartDate);
    // Se le suman las horas UTC del servidor ya que por defecto viene como las 00:00 UTC 0, para que sea interpretado como las 00:00 UTC-6
    weekStartDate = new Date(weekStartDate.getTime() + (weekStartDate.getTimezoneOffset() * 60000));

    if (weekStartDate.getDay() !== this.weekStartDay) {
      const dayName = this.daysOfWeekInSpanish[this.weekStartDay];
      throw new AppErrorResponse({ statusCode: 400, name: `La fecha de inicio de semana debe ser un ${dayName}` });
    }

    const weekCutoffDate = getNextTuesday(weekStartDate); // (último martes despues del inicio de semana)

    console.log(weekStartDate, weekStartDate.getDay(), this.daysOfWeekInSpanish[weekStartDate.getDay()])
    console.log(weekCutoffDate, weekCutoffDate.getDay(), this.daysOfWeekInSpanish[weekCutoffDate.getDay()])

    const formattedWeekStartDate = moment(weekStartDate).format('YYYY-MM-DD')
    const formattedWeekCutoffDate = moment(weekCutoffDate).format('YYYY-MM-DD')

    console.log(formattedWeekStartDate, formattedWeekCutoffDate)

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }).populate(["job", "department"]).exec();
    const lines = [];

    // Obtener las asistencias, faltas y tiempo extra entre las fechas de corte e inicio de semana
    const attendances = await AttendanceModel.find({ active: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate } });
    const absences = await AbsenceModel.find({ active: true, isJustified: false, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate }, });
    const paidAbsences = await AbsenceModel.find({ active: true, isPaid: true, date: { $gte: formattedWeekStartDate, $lte: formattedWeekCutoffDate }, });
    const overtimeRecords = await OvertimeModel.find({ active: true, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate } })

    const attendancesByEmployee = groupBy(attendances, 'employeeId')
    const absencesByEmployee = groupBy(absences, 'employeeId')
    const paidAbsencesByEmployee = groupBy(paidAbsences, 'employeeId')
    const overtimeRecordsByEmployee = groupBy(overtimeRecords, 'employeeId')

    const fiveDaysSchemeBase = bigMath.chain(2).divide(5).done()
    const sixDaysSchemeBase = bigMath.chain(1).divide(6).done()

    // General Bonus
    const bonusOvertime = (await BonusModel.findOne({ active: true, inputId: 'horas_extra', enabled: true }))
    const bonusAttendance = await BonusModel.findOne({ active: true, inputId: 'asistencia', enabled: true })
    const bonusPunctuality = await BonusModel.findOne({ active: true, inputId: 'puntualidad', enabled: true })
    const bonusGrocery = await BonusModel.findOne({ active: true, inputId: 'despensa', enabled: true })

    // Personal bonus that overrides general bonus
    const personalBonusOvertime = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusOvertime?._id, enabled: true })
    const personalBonusAttendance = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusAttendance?._id, enabled: true })
    const personalBonusPunctuality = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusPunctuality?._id, enabled: true })
    const personalBonusGrocery = await PersonalBonusModel.find({ active: true, entityType: 'bonus', entityId: bonusGrocery?._id, enabled: true })

    // Other custom personal bonus
    const customPersonalBonus = await PersonalBonusModel.find({ active: true, entityType: 'catalog-personal-bonus', enabled: true })

    for (const [index, employee] of employees.entries()) {
      const dailySalary = employee.dailySalary
      const jobScheme = employee.jobScheme

      const employeeAttendances = attendancesByEmployee[employee.id] || [];
      const employeeAbsences = absencesByEmployee[employee.id] || [];
      const employeePaidAbsences = paidAbsencesByEmployee[employee.id] || [];
      const employeeOvertimeRecords = overtimeRecordsByEmployee[employee.id] || [];
      const employeeTardies = employeeAttendances.filter((x) => x.isLate);

      const employeeBonusOvertime = personalBonusOvertime.find((x) => x.idEmployee === employee._id) ?? bonusOvertime
      const employeeBonusAttendance = personalBonusAttendance.find((x) => x.idEmployee === employee._id) ?? bonusAttendance
      const employeeBonusPunctuality = personalBonusPunctuality.find((x) => x.idEmployee === employee._id) ?? bonusPunctuality
      const employeeBonusGrocery = personalBonusGrocery.find((x) => x.idEmployee === employee._id) ?? bonusGrocery

      const employeeCustomBonuses = customPersonalBonus.filter((x) => x.idEmployee === employee._id)

      const restDaysMultiplier = jobScheme === '5' ? fiveDaysSchemeBase : sixDaysSchemeBase

      // Salario base por los días trabajados
      const daysWorked = employeeAttendances.length + employeePaidAbsences.length // TODO update later
      const paidRestDays = bigMath.multiply(daysWorked, restDaysMultiplier)
      const totalDays = daysWorked + paidRestDays
      const salary = dailySalary * totalDays

      // Horas extra
      const extraHours = Number(sumField(employeeOvertimeRecords, 'hours').toFixed(2))
      const extraHoursPayment = extraHours * (employeeBonusOvertime?.value ?? 0) // ((dailySalary / 8) * 2)

      // Bono de asistencia
      const attendanceBonus = employeeAbsences.length > 0 ? 0 : this.evaluateBonus(employeeBonusAttendance, salary);
      // Bono de puntualidad
      const punctualityBonus = employeeTardies.length >= 2 ? 0 : this.evaluateBonus(employeeBonusPunctuality, salary);
      // Bono de despensa
      const groceryBonus = this.evaluateBonus(employeeBonusGrocery, salary);
      // Bono por día festivo (triple pago)
      const workedHolidays = employeeAttendances.filter(x => this.holidayList.includes(x.checkInTime.slice(0, 10))).length;
      const holidayBonus = workedHolidays * dailySalary * 2
      // Otros bonos
      const customBonusesAmounts = employeeCustomBonuses.map((x) => { return { amount: this.evaluateBonus(x, salary), taxable: x.taxable } })
      const customBonusesTotal = sumField(customBonusesAmounts, 'amount')
      // Calcular el neto a pagar
      const taxPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + sumField(customBonusesAmounts.filter((x) => x.taxable === true), 'amount')
      const netPay = salary + extraHoursPayment + attendanceBonus + punctualityBonus + holidayBonus + customBonusesTotal

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

    if (body.preview != null) return { lines, startDate: weekStartDate, cutoffDate: weekCutoffDate }

    let record = await PayrollModel.findOne({ active: true, startDate: formattedWeekStartDate });
    if (record) {
      record.lines = lines;
      record.name = `Nomina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`;
    }
    else {
      record = new PayrollModel({
        id: 'PR' + String(await consumeSequence('payrolls', session)).padStart(8, '0'),
        name: `Nomina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`,
        lines,
        startDate: formattedWeekStartDate,
        cutoffDate: formattedWeekCutoffDate,
      });
    }

    await record.save({ session });
    return record;
  }

  evaluateBonus(bonus: IBonus | IPersonalBonus | null, salary: number): number {
    if (!bonus || bonus?.value == null) return 0
    if (bonus.type === BonusType.AMOUNT) return bonus.value
    if (bonus.type === BonusType.PERCENT) return (bonus.value / 100) * salary
    return 0
  }

  async excelReport(query: any) {
    const payrollId = query.id
    if (payrollId == null) throw new AppErrorResponse({ statusCode: 400, name: 'El id es requerido' });

    const payroll = await PayrollModel.findOne({ active: true, id: payrollId })
    if (payroll == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el pago de nomina' });

    const employeeIds = payroll.lines.map(x => x.employeeId)
    const employees = await employeeService.get({ ids: employeeIds })

    const departmentIds = [...new Set(payroll.lines.map(x => x.departmentId))];
    const departments = await departmentService.get({ ids: departmentIds })

    const jobIds = [...new Set(payroll.lines.map(x => x.jobId))];
    const jobs = await jobService.get({ ids: jobIds })

    const rowsArray = payroll.lines.map((line: any) => {
      const employee: IEmployee = employees[line.employeeId]
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
        // tardies: line.tardies,
        netPay: line.netPay,
        taxPay: line.taxPay,

        jobScheme: line.jobScheme,

        departmentId: line.departmentId,
      }
    })

    const rowsByDepartment = rowsArray.reduce((acc: any, row: any) => {
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
    const workbook = new ExcelJS.Workbook()

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'aaaaaa' } },
      left: { style: 'thin', color: { argb: 'aaaaaa' } },
      bottom: { style: 'thin', color: { argb: 'aaaaaa' } },
      right: { style: 'thin', color: { argb: 'aaaaaa' } }
    }

    const headerStyle: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'dce6f1' }
    }

    for (const [departmentName, rowArray] of Object.entries(rowsByDepartment)) {
      const worksheet = workbook.addWorksheet(departmentName, {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      worksheet.columns = [
        { header: 'Nomina', key: 'date', width: 20, style: { numFmt: 'DD/MM/YYYY' } },
        { header: 'Puesto', key: 'jobName', width: 15, style: { numFmt: '@' } },
        { header: 'CURP', key: 'mxCurp', width: 20, style: { numFmt: '@' } },
        { header: 'Numero seguro social', key: 'mxNss', width: 20, style: { numFmt: '@' } },
        { header: 'Nombre del empleado', key: 'employeeName', width: 30, style: { numFmt: '@' } },

        { header: 'S.D.I', key: 'sdi', width: 10, style: { numFmt: '@' } },

        { header: 'Salario Diario', key: 'dailySalary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Dias Trabajados', key: 'daysWorked', width: 11, style: { numFmt: '@' } },
        { header: 'Parte Proporcional Sab y Dom', key: 'paidRestDays', width: 20, style: { numFmt: '@' } },
        { header: 'Dias a Pagar', key: 'totalDays', width: 10, style: { numFmt: '@' } },
        { header: 'Sueldo del Periodo', key: 'salary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Horas Tiempo Extra', key: 'extraHours', width: 10, style: { numFmt: '@' } },
        { header: 'Valor Tiempo Extra', key: 'extraHoursPayment', width: 10, style: { numFmt: '"$"#,##0.00' } },

        { header: 'Premios de puntualidad', key: 'punctualityBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Bono de Asistencia', key: 'attendanceBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Despensa', key: 'groceryBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Dia festivo', key: 'holidayBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Otros bonos', key: 'customBonusesTotal', width: 15, style: { numFmt: '"$"#,##0.00' } },
        // { header: '', key: 'tardies', width: 10, style: { numFmt: '@' } },
        { header: 'Base Gravable', key: 'taxPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Total a pagar', key: 'netPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
      ]

      // Headers 1
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
      headerRow.eachCell((cell: any) => { cell.border = borderStyle })
      headerRow.eachCell((cell: any) => { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
      headerRow.font = { bold: true };

      // Solo agregar las propiedades que coinciden con las columnas definidas
      (rowArray as any).forEach((row: any) => {
        const filteredRow = worksheet.columns.reduce((acc: any, col: any) => {
          if (col.key in row) {
            acc[col.key] = row[col.key];
          }
          return acc;
        }, {});

        worksheet.addRow(filteredRow);
      });

      const totalsRow = worksheet.addRow([
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
    const summaryData = Object.keys(rowsByDepartment).map(departmentName => {
      const rows = rowsByDepartment[departmentName];
      const totalEmployees = rows.length;
      const totalAmount = rows.reduce((sum: number, row: any) => sum + row.netPay, 0);
      return { departmentName, totalEmployees, totalAmount };
    });

    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
      { header: 'Departamento', key: 'departmentName', width: 20 },
      { header: 'Empleados', key: 'totalEmployees', width: 15 },
      { header: 'Cantidad a Pagar', key: 'totalAmount', width: 20, style: { numFmt: '"$"#,##0.00' } },
    ];

    const headerRow = summarySheet.getRow(1)
    headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
    headerRow.eachCell((cell: any) => { cell.border = borderStyle })
    headerRow.eachCell((cell: any) => { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
    headerRow.font = { bold: true };

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

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: `${payroll.name}.xlsx` }
  }
}

const payrollService: PayrollService = new PayrollService();
export default payrollService;
