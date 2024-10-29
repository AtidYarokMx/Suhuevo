import request from 'supertest'
import { appServer } from '../index'
import { executePayrollPreviewExpectedResponse } from './mock/payroll.mock'
import { AppMongooseRepo } from '@app/repositories/mongoose'

describe("POST /api/payroll/execute-payroll", () => {
  it("status code is 200", async () => {
    const response = await request(appServer.app).post("/api/payroll/execute-payroll").send({
      "weekStartDate": "2024-10-16T06:00:00.000Z",
      "preview": true
    }).set({ "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmQ5ZjZlMTdhY2VkMjYzODIxYTU0NTEiLCJpZCI6Ijk2YzIzYTgxLTJiMmYtNDIzNy05Y2I2LXJvb3QiLCJlbWFpbCI6ImVkZ2FyQGF0aWR5YXJvay5jb20iLCJuYW1lIjoiRWRnYXIiLCJmaXJzdExhc3ROYW1lIjoiIiwic2Vjb25kTGFzdE5hbWUiOiJNIiwicm9sZSI6InJvb3QiLCJwaG9uZSI6IjMzMTIzMjUyNTIiLCJpYXQiOjE3Mjk5MTc1NDksImV4cCI6MTczMjUwOTU0OX0.WcHKoYRJVm-YAhh6PSUqXfDQRRiQ6VVO5TOpLyA204o" })

    expect(response.statusCode).toBe(200)
  })

  it("expected response", async () => {
    const response = await request(appServer.app).post("/api/payroll/execute-payroll").send({
      "weekStartDate": "2024-10-16T06:00:00.000Z",
      "preview": true
    }).set({ "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmQ5ZjZlMTdhY2VkMjYzODIxYTU0NTEiLCJpZCI6Ijk2YzIzYTgxLTJiMmYtNDIzNy05Y2I2LXJvb3QiLCJlbWFpbCI6ImVkZ2FyQGF0aWR5YXJvay5jb20iLCJuYW1lIjoiRWRnYXIiLCJmaXJzdExhc3ROYW1lIjoiIiwic2Vjb25kTGFzdE5hbWUiOiJNIiwicm9sZSI6InJvb3QiLCJwaG9uZSI6IjMzMTIzMjUyNTIiLCJpYXQiOjE3Mjk5MTc1NDksImV4cCI6MTczMjUwOTU0OX0.WcHKoYRJVm-YAhh6PSUqXfDQRRiQ6VVO5TOpLyA204o" })

    expect(response.body).toEqual(executePayrollPreviewExpectedResponse)
  })

  afterAll(async () => {
    await AppMongooseRepo.close()
    appServer.close()
  })
})