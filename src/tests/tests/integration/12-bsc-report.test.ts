/* lib */
import path from "node:path";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { appServer } from "@/index";
import console from "node:console";
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
    await mongoose.connect(uri);
    app = appServer.app;
  });

  afterAll(async () => {
    /* cerrar conexión */
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("should return a XLXS (excel) file", async () => {
    const response = await request(app).post("/api/bsc/excel").send();
    expect(response.status).toBe(200);
  });
});
