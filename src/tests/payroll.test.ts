import { PersonalBonusModel } from "@app/repositories/mongoose/models/personal-bonus.model";
import payrollService from "../services/payroll.service";
import mongoose from "mongoose";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { OvertimeModel } from "@app/repositories/mongoose/models/overtime.model";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { BonusModel } from "@app/repositories/mongoose/models/bonus.model";

// Mockear las conexiones a la base de datos
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || "mongodb://localhost:27017/testdb");
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  // Limpiar todos los datos creados durante las pruebas
  await AttendanceModel.deleteMany({});
  await OvertimeModel.deleteMany({});
  await AbsenceModel.deleteMany({});
  await PersonalBonusModel.deleteMany({});
});

describe("Payroll Service Testing", () => {

  test("Caso 1: Empleado con Bonos Generales y sin Personalizados", async () => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result).toBeDefined();
    expect(result.lines[0].attendanceBonus).toBeGreaterThan(0);
    expect(result.lines[0].punctualityBonus).toBeGreaterThan(0);
    expect(result.lines[0].groceryBonus).toBeGreaterThan(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 2: Empleado con Bonos Personalizados", async () => {
    await PersonalBonusModel.create({
      active: true,
      entityType: "bonus",
      entityId: "horas_extra",
      idEmployee: "ID_DEL_EMPLEADO",
      value: 150,
      type: "AMOUNT",
      taxable: true,
      enabled: true,
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].extraHoursPayment).toBeGreaterThan(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 3: Empleado con Asistencia Incompleta", async () => {
    await AttendanceModel.create({
      employeeId: "ID_DEL_EMPLEADO",
      date: "2025-03-20",
      isLate: false,
      active: true,
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].attendanceBonus).toBe(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 4: Empleado con Tardanzas", async () => {
    await AttendanceModel.create({
      employeeId: "ID_DEL_EMPLEADO",
      date: "2025-03-20",
      isLate: true,
      active: true,
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].punctualityBonus).toBe(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 5: Empleado con Horas Extras", async () => {
    await OvertimeModel.create({
      employeeId: "ID_DEL_EMPLEADO",
      hours: 5,
      active: true,
      startTime: "2025-03-20",
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].extraHours).toBe(5);
    expect(result.lines[0].extraHoursPayment).toBeGreaterThan(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 6: Empleado con Festivo Trabajado", async () => {
    await AbsenceModel.create({
      employeeId: "ID_DEL_EMPLEADO",
      reason: "Festivo Trabajado",
      active: true,
      date: "2025-03-20",
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].holidayBonus).toBeGreaterThan(0);

    await session.abortTransaction();
    session.endSession();
  });

  test("Caso 7: Empleado sin ningún bono configurado", async () => {
    await BonusModel.deleteMany({});
    await PersonalBonusModel.deleteMany({});

    const session = await mongoose.startSession();
    session.startTransaction();

    const body = { weekStartDate: "2025-03-20" };
    const result = await payrollService.executeWeeklyPayroll(body, session);

    expect(result.lines[0].attendanceBonus).toBe(0);
    expect(result.lines[0].punctualityBonus).toBe(0);
    expect(result.lines[0].groceryBonus).toBe(0);

    await session.abortTransaction();
    session.endSession();
  });
});