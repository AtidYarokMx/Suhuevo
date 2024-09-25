import { EEmployeStatus, IEmployee } from "@app/dtos/employee.dto";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { formatDate, formatDateToYYMMDD, getNextTuesday } from "@app/utils/util.util";
import { getLastTuesday, getLastWednesday } from '../application/utils/util.util';
import * as ExcelJS from 'exceljs'
import { consumeSequence } from "@app/utils/sequence";
import { ClientSession } from "mongoose";
import { PayrollModel } from "@app/repositories/mongoose/models/payroll.model";
import { AppErrorResponse } from "@app/models/app.response";
import employeeService from "./employee.service";
import { IPayroll } from "@app/dtos/payroll.dto";
import { ScheduleExceptionModel } from "@app/repositories/mongoose/models/schedule-exception.model";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { IAttendance } from "@app/dtos/attendance.dto";
import { IAbsence } from "@app/dtos/absence.dto";
import { bigMath } from "@app/utils/math.util";

class PayrollService {
  private readonly daysOfWeekInSpanish = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  private readonly attendanceBonusPercentage = 0.1;
  private readonly punctualityBonusPercentage = 0.1;
  private readonly groceryBonus = 290.00;
  private readonly vacationBonusPercentage = 0.25;
  private readonly holidayList = ['240101', '241225', '241231'];

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
    if (records.length === 0) return [] // throw new AppErrorResponse({ name: 'No se encontraron registros', statusCode: 404 })
    return this.populateResults(records)
  }

  async populateResults(array: IPayroll[]): Promise<any> {
    const populatedArray = JSON.parse(JSON.stringify(array))
    for (const record of populatedArray) {
      record.totalAmount = record.lines.reduce((sum: number, line: any) => sum + line.netPay, 0);
    }

    return populatedArray
  }

  // -------------------------------------------------------------

  async executeWeeklyPayroll(body: any, session: ClientSession): Promise<any> {
    let weekStartDate = body.weekStartDate
    if (weekStartDate == null || isNaN(new Date(weekStartDate).getTime())) {
      throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });
    }
    weekStartDate = new Date(weekStartDate);
    // Se le suman las horas UTC del servidor ya que por defecto viene como las 00:00 UTC 0, para que sea interpretado como las 00:00 UTC-6
    weekStartDate = new Date(weekStartDate.getTime() + (weekStartDate.getTimezoneOffset() * 60000));

    console.log(weekStartDate, weekStartDate.getDay(), this.daysOfWeekInSpanish[weekStartDate.getDay()])

    if (weekStartDate.getDay() !== this.weekStartDay) {
      const dayName = this.daysOfWeekInSpanish[this.weekStartDay];
      throw new AppErrorResponse({ statusCode: 400, name: `La fecha de inicio de semana debe ser un ${dayName}` });
    }

    // const existingPayroll = await PayrollModel.findOne({ active: true, startDate: weekStartDate })
    // if (existingPayroll != null) {
    //   throw new AppErrorResponse({ statusCode: 400, name: `Ya se ejecutó la nomina para el periodo ${weekStartDate.toISOString().slice(0,10)}` });
    // }

    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday

    // Verificar si es día de pago de nómina
    // if (currentDay !== this.paymentDay && currentDay !== (this.paymentDay - 1)) {
    //   throw new AppErrorResponse({ statusCode: 400, name: `El pago de nómina debe ser un ${this.daysOfWeekInSpanish[this.paymentDay]}` });
    // }

    // if (currentDay === (this.paymentDay - 1)) {
    //   const nextDate = new Date(currentDate);
    //   nextDate.setDate(nextDate.getDate() + 1);
    //   if (!this.holidayList.includes(formatDateToYYMMDD(nextDate))) {
    //     throw new AppErrorResponse({ statusCode: 400, name: `El pago de nómina debe ser un ${this.daysOfWeekInSpanish[this.paymentDay]}` });
    //   }
    // }

    const weekCutoffDate = getNextTuesday(weekStartDate); // (último martes despues del inicio de semana)

    // if (currentDate < weekCutoffDate) {
    //   throw new AppErrorResponse({ statusCode: 400, name: `La fecha de corte (${weekCutoffDate.toISOString().slice(0,10)}) aún no ha llegado. No se puede ejecutar la nómina.` });
    // }

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }).populate(["job", "department"]).exec();
    // console.log(employees)

    const lines = [];
    let rowIndex = 1

    for (const employee of employees) {
      const dailySalary = employee.dailySalary
      const jobScheme = employee.jobScheme

      // Obtener las asistencias del empleado entre las fechas de corte y inicio de semana
      const attendances = await AttendanceModel.find({
        active: true,
        employeeId: employee.id,
        checkInTime: { $gte: weekStartDate.toISOString(), $lte: weekCutoffDate.toISOString() },
      });

      const absences = await AbsenceModel.find({
        active: true,
        isJustified: false,
        employeeId: employee.id,
        date: { $gte: weekStartDate, $lte: weekCutoffDate },
      });

      const paidAbsences = await AbsenceModel.find({
        active: true,
        isPaid: true,
        employeeId: employee.id,
        date: { $gte: weekStartDate, $lte: weekCutoffDate },
      });

      const fiveDaysSchemeBase = bigMath.chain(7).divide(5).done()
      const sixDaysSchemeBase = bigMath.chain(7).divide(6).done()

      console.log(fiveDaysSchemeBase, sixDaysSchemeBase)

      const restDaysMultiplier = jobScheme === '5' ? fiveDaysSchemeBase : sixDaysSchemeBase
      // Salario base por los días trabajados
      const daysWorked = attendances.length + paidAbsences.length // TODO update later
      const paidRestDays = (daysWorked * restDaysMultiplier).toFixed(2);
      const totalDays = daysWorked + Number(paidRestDays)
      const salary = dailySalary * (totalDays)

      const extraHours = await this.calculateExtraHours(employee.id, weekStartDate, weekCutoffDate)
      const extraHoursPayment = extraHours * ((dailySalary / 8) * 2)

      // Bono de asistencia (10% del salario base)
      const attendanceBonus = this.calculateAttendanceBonus(absences, salary);

      // Bono de puntualidad (10% del salario base)
      const punctualityBonus = this.calculatePunctualityBonus(attendances, salary);

      // Bono de despensa ($290 MXN)
      const pantryBonus = this.groceryBonus;

      // Bono por día festivo (triple pago)
      const holidayBonus = this.calculateHolidayBonus(attendances, dailySalary);

      // Otras percepciones
      const otherPayments = holidayBonus
      const totalBonuses = attendanceBonus + punctualityBonus + pantryBonus + holidayBonus;
      // Calcular el neto a pagar
      const netPay = salary + extraHoursPayment + otherPayments;

      // Contar retardos
      const tardies = attendances.filter(attendance => attendance.isLate).length;

      lines.push({
        rowIndex,
        employeeId: employee.id,
        employeeName: employee.fullname(),
        jobId: employee.jobId,
        jobName: employee.job?.name ?? null,
        jobPosition: employee.jobId,
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
        pantryBonus,
        // holidayBonus,
        otherPayments,
        tardies,
        netPay,

        jobScheme
      });

      rowIndex++
    }

    if (body.preview != null) return { lines, startDate: weekStartDate, cutoffDate: weekCutoffDate }

    let record = await PayrollModel.findOne({ active: true, startDate: weekStartDate });
    if (record) {
      record.lines = lines;
      record.cutoffDate = weekCutoffDate;
      record.name = `Nómina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`;
    }
    else {
      record = new PayrollModel({
        id: String(await consumeSequence('payrolls', session)).padStart(8, '0'),
        name: `Nómina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`,
        lines,
        startDate: weekStartDate,
        cutoffDate: weekCutoffDate,
      });
    }

    await record.save({ session });
    return record;
  }

  calculateAttendanceBonus(absences: IAbsence[], salary: number): number {
    return absences.length > 0 ? 0 : salary * this.attendanceBonusPercentage;
  }

  calculatePunctualityBonus(attendances: IAttendance[], salary: number): number {
    const tardies = attendances.filter(attendance => attendance.isLate);
    return tardies.length >= 2 ? 0 : salary * this.punctualityBonusPercentage;
  }

  calculateHolidayBonus(attendances: IAttendance[], dailySalary: number): number {
    // Calcular el bono por día festivo (triple salario)
    const holidayAttendances = attendances.filter(attendance => this.holidayList.includes(formatDateToYYMMDD(new Date(attendance.checkInTime))));
    return holidayAttendances.length * dailySalary * 2; // Bono = 2 días extra (por triple pago)
  }

  async calculateExtraHours(employeeId: string, weekStartDate: Date, weekCutoffDate: Date) {
    const scheduleEvents = await ScheduleExceptionModel.find({
      active: true,
      employeeId,
      name: 'Horas Extra',
      $or: [
        {
          startDate: { $gte: weekStartDate.toISOString(), $lte: weekCutoffDate.toISOString() }
        },
        {
          endDate: { $gte: weekStartDate.toISOString(), $lte: weekCutoffDate.toISOString() }
        },
        {
          $and: [
            { startDate: { $lte: weekStartDate.toISOString() } },
            { endDate: { $gte: weekCutoffDate.toISOString() } }
          ]
        }
      ]
    })

    // Calcular horas extras si las fechas están en formato adecuado
    let totalExtraHours = 0;

    for (const exception of scheduleEvents) {
      const start = new Date(exception.startDate);
      const end = new Date(exception.endDate);

      const exceptionStart = start < weekStartDate ? weekStartDate : start;
      const exceptionEnd = end > weekCutoffDate ? weekCutoffDate : end;

      const hours = (exceptionEnd.getTime() - exceptionStart.getTime()) / 1000 / 60 / 60; // Conversión de milisegundos a horas
      totalExtraHours += hours;
    }

    return totalExtraHours

  }

  notifyPayrollAdmin(attendances: any[]): void {
    const missingCheckIns = attendances.filter(attendance => !attendance.checkedIn);
    const missingCheckOuts = attendances.filter(attendance => !attendance.checkedOut);

    if (missingCheckIns.length || missingCheckOuts.length) {
      // Lógica para enviar notificación al administrador
      console.log("Notificación: Faltan registros de check-in o check-out.");
    }
  }

  async excelReport(query: any) {
    const payrollId = query.id
    if (payrollId == null) throw new AppErrorResponse({ statusCode: 400, name: 'El id es requerido' });

    const payroll = await PayrollModel.findOne({ active: true, id: payrollId })
    if (payroll == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el pago de nómina' });

    const employeeIds = payroll.lines.map(x => x.employeeId)
    const employees = await employeeService.get({ ids: employeeIds })

    const rowsArray = payroll.lines.map((line: any) => {
      const employee: IEmployee = employees[line.employeeId]
      return {
        date: payroll.cutoffDate,
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
        pantryBonus: line.pantryBonus,
        // holidayBonus: line.holidayBonus,
        otherPayments: line.otherPayments,
        // tardies: line.tardies,
        netPay: line.netPay,

        jobScheme: line.jobScheme
      }
    })

    const rowsArrayScheme5 = rowsArray.filter((row: any) => row.jobScheme === '5').map(({ jobScheme, ...rest }) => rest);
    const rowArrayScheme6 = rowsArray.filter((row: any) => row.jobScheme === '6').map(({ jobScheme, ...rest }) => rest);
    // ------------------- Construir archivo excel ----------------------------------------------------
    const workbook = new ExcelJS.Workbook()

    for (const item of [{ sheetName: '5', rowArray: rowsArrayScheme5 }, { sheetName: '6', rowArray: rowArrayScheme6 }]) {
      const rowArray = item.rowArray
      const worksheet = workbook.addWorksheet(`CALCULO DE NOMINA ${item.sheetName} DIAS`, {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      })

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

      // Headers 1
      const columnHeaders = ('Nomina,CURP,Numero Seguro Social,Nombre del empleado,S.D.I,Salario Diario,Dias Trabajados,Parte Proporcional Sab y Dom,Dias a Pagar,Sueldo del Periodo,Horas Tiempo Extra,Valor Tiempo Extra,Premios de puntualidad,Bono de Asistencia,Despensa,Otras Percepciones,Base Gravable').split(',')
      const headerRow = worksheet.addRow(
        columnHeaders
      )
      headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
      headerRow.eachCell((cell: any) => { cell.border = borderStyle })
      headerRow.font = { bold: true }

      worksheet.columns = [
        { key: 'date', width: 20, style: { numFmt: 'DD/MM/YYYY' } },
        { key: 'mxCurp', width: 20, style: { numFmt: '@' } },
        { key: 'mxNss', width: 20, style: { numFmt: '@' } },
        { key: 'employeeName', width: 30, style: { numFmt: '@' } },

        { key: 'sdi', width: 10, style: { numFmt: '@' } },

        { key: 'dailySalary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { key: 'daysWorked', width: 11, style: { numFmt: '@' } },
        { key: 'paidRestDays', width: 20, style: { numFmt: '@' } },
        { key: 'totalDays', width: 10, style: { numFmt: '@' } },
        { key: 'salary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { key: 'extraHours', width: 10, style: { numFmt: '@' } },
        { key: 'extraHoursPayment', width: 10, style: { numFmt: '"$"#,##0.00' } },

        { key: 'punctualityBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { key: 'attendanceBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { key: 'pantryBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },

        { key: 'otherPayments', width: 15, style: { numFmt: '"$"#,##0.00' } },
        // { key: 'tardies', width: 10, style: { numFmt: '@' } },
        { key: 'netPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
      ]

      rowArray.forEach((doc: any, index: any) => {
        const row = worksheet.addRow(Object.values(doc))
        row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = borderStyle })
      })

      columnHeaders.forEach((header, index) => {
        const column = worksheet.getColumn(index + 1)
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        })
      })

      const totalsRow = worksheet.addRow([
        'Totales', '', '', '', '', '', '', '', '',
        { formula: `SUM(J2:J${worksheet.rowCount})` }, // Total salary
        { formula: `SUM(K2:K${worksheet.rowCount})` }, // Total extraHours 
        { formula: `SUM(L2:L${worksheet.rowCount})` }, // Total extraHoursPayment
        { formula: `SUM(M2:M${worksheet.rowCount})` }, // Total punctualityBonus
        { formula: `SUM(N2:N${worksheet.rowCount})` }, // Total attendanceBonus
        { formula: `SUM(O2:O${worksheet.rowCount})` }, // Total pantryBonus
        { formula: `SUM(P2:P${worksheet.rowCount})` }, // Total others
        { formula: `SUM(Q2:Q${worksheet.rowCount})` }, // Total netPay
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

    const excelBuffer = await workbook.xlsx.writeBuffer()
    return { file: excelBuffer, fileName: `${payroll.name}.xlsx` }
  }
}

const payrollService: PayrollService = new PayrollService();
export default payrollService;
