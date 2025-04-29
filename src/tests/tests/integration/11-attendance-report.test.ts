/* lib */
import path from "node:path";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { appServer } from "@/index";
import console from "node:console";
/* models */
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { OvertimeModel } from "@app/repositories/mongoose/models/overtime.model";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
/* types */
import type { Application } from "express";

/* config */
jest.setTimeout(600000); // Para evitar timeout de Jest (5s por defecto)

describe("POST /api/attendance/import-csv", () => {
  let app: Application;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log(uri);
    await mongoose.connect(uri, { dbName: "test" });
    app = appServer.app;
  });

  afterAll(async () => {
    /* eliminar datos de testing */
    await AttendanceModel.deleteMany({});
    await AbsenceModel.deleteMany({});
    await OvertimeModel.deleteMany({});
    /* cerrar conexión */
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("should return an error of no CSV file", async () => {
    const response = await request(app).post("/api/attendance/import-csv").send();
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "El archivo CSV es requerido");
  });

  it("should return an error of CSV rows does not match headers", async () => {
    const file = path.resolve(__dirname, "../../files/api-attendance-import-csv/01-error-test.csv");
    const response = await request(app).post("/api/attendance/import-csv").attach("file", file);
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "RangeError: Row length does not match headers");
  });

  it("should return an error of CSV empty", async () => {
    const file = path.resolve(__dirname, "../../files/api-attendance-import-csv/02-error-test.csv");
    const response = await request(app).post("/api/attendance/import-csv").attach("file", file);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "El archivo CSV no contiene registros válidos");
  });

  it("should return an error of bad dates in CSV", async () => {
    const file = path.resolve(__dirname, "../../files/api-attendance-import-csv/03-error-test.csv");
    const response = await request(app).post("/api/attendance/import-csv").attach("file", file);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "No se encontraron fechas válidas en el CSV");
  });

  it("should process a CSV and return the correct attendance, absence, and extra hours summary", async () => {
    const file = path.resolve(__dirname, "../../files/api-attendance-import-csv/01-success-test.csv");
    const response = await request(app).post("/api/attendance/import-csv").attach("file", file);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("weekStart", "2025-04-16");
    expect(response.body).toHaveProperty("weekEnd", "2025-04-22");
    expect(response.body).toHaveProperty("automaticAttendance", 27);
    expect(response.body).toHaveProperty("newAttendances", 40);
    expect(response.body).toHaveProperty("newAbsences", 398);
  });
});
