import { EEmployeStatus, IEmployee } from "@app/dtos/employee.dto";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { formatDate, formatDateToYYMMDD, getNextTuesday, groupBy, sumField } from "@app/utils/util.util";
import * as ExcelJS from 'exceljs'
import { consumeSequence } from "@app/utils/sequence";
import { ClientSession } from "mongoose";
import { PayrollModel } from "@app/repositories/mongoose/models/payroll.model";
import { AppErrorResponse } from "@app/models/app.response";
import employeeService from "./employee.service";
import { IPayroll } from "@app/dtos/payroll.dto";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { IAttendance } from "@app/dtos/attendance.dto";
import { bigMath } from "@app/utils/math.util";
import { OvertimeModel } from "@app/repositories/mongoose/models/overtime.model";
import moment from "moment";
import { BonusModel } from "@app/repositories/mongoose/models/bonus.model";
import { BonusType, IBonus } from "@app/dtos/bonus.dto";

class PayrollService {
  private readonly daysOfWeekInSpanish = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // private readonly attendanceBonusPercentage = 0.1; 
  // private readonly punctualityBonusPercentage = 0.1;
  // private readonly groceryBonus = 145.00;
  // private readonly vacationBonusPercentage = 0.25;
  private readonly holidayList = ['240101', '240801', '241225', '241231'];

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
    let weekStartDate: any =  body.weekStartDate // '2024-09-11T06:00:00.000Z'
    if (weekStartDate == null || isNaN(new Date(weekStartDate).getTime())) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });

    weekStartDate = new Date(weekStartDate);
    // Se le suman las horas UTC del servidor ya que por defecto viene como las 00:00 UTC 0, para que sea interpretado como las 00:00 UTC-6
    weekStartDate = new Date(weekStartDate.getTime() + (weekStartDate.getTimezoneOffset() * 60000));
    console.log(weekStartDate, weekStartDate.getDay(), this.daysOfWeekInSpanish[weekStartDate.getDay()])

    if (weekStartDate.getDay() !== this.weekStartDay) {
      const dayName = this.daysOfWeekInSpanish[this.weekStartDay];
      throw new AppErrorResponse({ statusCode: 400, name: `La fecha de inicio de semana debe ser un ${dayName}` });
    }

    const weekCutoffDate = getNextTuesday(weekStartDate); // (último martes despues del inicio de semana)

    const formattedWeekStartDate = moment(weekStartDate).format('YYYY-MM-DD HH:mm:ss')
    const formattedWeekCutoffDate = moment(weekCutoffDate).format('YYYY-MM-DD HH:mm:ss')

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE }).populate(["job", "department"]).exec();
    const lines = [];
    
    // Obtener las asistencias y faltas entre las fechas de corte y inicio de semana
    const attendances = await AttendanceModel.find({ active: true, checkInTime: { $gte: weekStartDate.toISOString(), $lte: weekCutoffDate.toISOString() }});
    const absences = await AbsenceModel.find({ active: true, isJustified: false, date: { $gte: weekStartDate, $lte: weekCutoffDate },});
    const paidAbsences = await AbsenceModel.find({ active: true, isPaid: true, date: { $gte: weekStartDate, $lte: weekCutoffDate },});
    const overtimeRecords = await OvertimeModel.find({ active: true, startTime: { $gte: formattedWeekStartDate, $lt: formattedWeekCutoffDate} })

    const attendancesByEmployee = groupBy(attendances, 'employeeId')
    const absencesByEmployee = groupBy(absences, 'employeeId')
    const paidAbsencesByEmployee = groupBy(paidAbsences, 'employeeId')
    const overtimeRecordsByEmployee = groupBy(overtimeRecords, 'employeeId')

    const fiveDaysSchemeBase = bigMath.chain(7).divide(5).done()
    const sixDaysSchemeBase = bigMath.chain(7).divide(6).done()

    const amountBonusOvertime = (await BonusModel.findOne({ active: true, inputId: 'horas_extra', enabled: true }))?.value ?? 0
    const bonusAttendance = await BonusModel.findOne({ active: true, inputId: 'asistencia', enabled: true })
    const bonusPunctuality = await BonusModel.findOne({ active: true, inputId: 'puntualidad', enabled: true })
    const bonusGrocery = await BonusModel.findOne({ active: true, inputId: 'despensa', enabled: true })

    for (const [index, employee] of employees.entries()) {
      const dailySalary = employee.dailySalary
      const jobScheme = employee.jobScheme

      const employeeAttendances = attendancesByEmployee[employee.id] || [];
      const employeeAbsences = absencesByEmployee[employee.id] || [];
      const employeePaidAbsences = paidAbsencesByEmployee[employee.id] || [];
      const employeeOvertimeRecords = overtimeRecordsByEmployee[employee.id] || [];

      const restDaysMultiplier = jobScheme === '5' ? fiveDaysSchemeBase : sixDaysSchemeBase
      // Salario base por los días trabajados
      const daysWorked = employeeAttendances.length + employeePaidAbsences.length // TODO update later
      const paidRestDays = (daysWorked * restDaysMultiplier).toFixed(2);
      const totalDays = daysWorked + Number(paidRestDays)
      const salary = dailySalary * (totalDays)

      const extraHours = Math.floor(sumField(employeeOvertimeRecords, 'hours'))
      const extraHoursPayment = extraHours * amountBonusOvertime // ((dailySalary / 8) * 2) // xd

      // Contar retardos
      const tardies = employeeAttendances.filter((attendance: IAttendance) => attendance.isLate);
      // Bono de asistencia
      const attendanceBonus = employeeAbsences.length > 0 ? 0 : this.evaluateBonus(bonusAttendance, salary);
      // Bono de puntualidad
      const punctualityBonus = tardies.length >= 2 ? 0 : this.evaluateBonus(bonusPunctuality, salary);
      // Bono de despensa ($145 MXN)
      const pantryBonus = this.evaluateBonus(bonusGrocery, salary);
      // Bono por día festivo (triple pago)
      const holidayBonus = this.computeHolidayBonus(employeeAttendances, dailySalary);
      // Otras percepciones
      const otherPayments = holidayBonus
      const totalBonuses = attendanceBonus + punctualityBonus + pantryBonus + holidayBonus;
      // Calcular el neto a pagar
      const netPay = salary + extraHoursPayment + otherPayments + attendanceBonus + punctualityBonus;

      lines.push({
        rowIndex: index + 1,
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
        tardies: tardies.length,
        netPay,

        jobScheme
      });
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
        id: 'PR' + String(await consumeSequence('payrolls', session)).padStart(8, '0'),
        name: `Nómina del ${formatDate(weekStartDate)} al ${formatDate(weekCutoffDate)}`,
        lines,
        startDate: weekStartDate,
        cutoffDate: weekCutoffDate,
      });
    }

    await record.save({ session });
    return record;
  }

  evaluateBonus(bonus: IBonus | null, salary: number): number {
    if (!bonus || bonus?.value == null) return 0
    if (bonus.type === BonusType.AMOUNT) return bonus.value
    if (bonus.type === BonusType.PERCENT) return (bonus.value / 100) * salary
    return 0
  }

  // calculateAttendanceBonus(absences: IAbsence[], salary: number): number {
  //   return absences.length > 0 ? 0 : salary * this.attendanceBonusPercentage;
  // }

  // calculatePunctualityBonus(tardies: IAttendance[], salary: number): number {
  //   return tardies.length >= 2 ? 0 : salary * this.punctualityBonusPercentage;
  // }

  computeHolidayBonus(attendances: IAttendance[], dailySalary: number): number {
    // Calcular el bono por día festivo (triple salario)
    const holidayAttendances = attendances.filter(attendance => this.holidayList.includes(formatDateToYYMMDD(new Date(attendance.checkInTime))));
    return holidayAttendances.length * dailySalary * 2; // Bono = 2 días extra (por triple pago)
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

      worksheet.columns = [
        { header: 'Nomina', key: 'date', width: 20, style: { numFmt: 'DD/MM/YYYY' } },
        { header: 'CURP', key: 'mxCurp', width: 20, style: { numFmt: '@' } },
        { header: 'Numero seguro social', key: 'mxNss', width: 20, style: { numFmt: '@' } },
        { header: 'Nombre del empleado', key: 'employeeName', width: 30, style: { numFmt: '@' } },

        { header: 'S.D.I', key: 'sdi', width: 10, style: { numFmt: '@' } },

        { header: 'Salario Diario', key: 'dailySalary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Dias Trabajados', key: 'daysWorked', width: 11, style: { numFmt: '@' } },
        { header: 'Parte Proporcional Sab y Dom', key: 'paidRestDays', width: 20, style: { numFmt: '@' } },
        { header: 'Dias a Pargar', key: 'totalDays', width: 10, style: { numFmt: '@' } },
        { header: 'Sueldo del Periodo', key: 'salary', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Horas Tiempo Extra', key: 'extraHours', width: 10, style: { numFmt: '@' } },
        { header: 'Valor Tiempo Extra', key: 'extraHoursPayment', width: 10, style: { numFmt: '"$"#,##0.00' } },

        { header: 'Premios de puntualidad', key: 'punctualityBonus', width: 15, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Bono de Asistencia', key: 'attendanceBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },
        { header: 'Despensa', key: 'pantryBonus', width: 10, style: { numFmt: '"$"#,##0.00' } },

        { header: 'Otras Percepciones', key: 'otherPayments', width: 15, style: { numFmt: '"$"#,##0.00' } },
        // { header: '', key: 'tardies', width: 10, style: { numFmt: '@' } },
        { header: 'Base Gravable', key: 'netPay', width: 10, style: { numFmt: '"$"#,##0.00' } },
      ]

      // Headers 1
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell((cell: any) => { cell.fill = headerStyle })
      headerRow.eachCell((cell: any) => { cell.border = borderStyle })
      headerRow.eachCell((cell: any) => { cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
      headerRow.font = { bold: true }

      rowArray.forEach((doc: any, index: any) => {
        const row = worksheet.addRow(Object.values(doc))
        row.eachCell({ includeEmpty: true }, (cell: any) => { cell.border = borderStyle })
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
