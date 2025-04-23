import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { appServer } from '@/index'
import { count } from 'console'

jest.setTimeout(30000) // Para evitar timeout de Jest (5s por defecto)
const uniqueCode = `TESTBOX-${Date.now()}`
const uniqueShipmentId = `SHIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;



describe('Flujo completo: Producción → Envío → Venta', () => {
  let mongoServer: MongoMemoryServer
  let app: any
  let boxId: string

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    await mongoose.connect(uri)
    app = appServer.app
  })

  afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    await mongoServer.stop()
  })

  it('debe crear una caja de producción', async () => {
    const response = await request(app).post('/api/boxes').send({
      code: uniqueCode,
      shed: new mongoose.Types.ObjectId().toString(),
      farm: new mongoose.Types.ObjectId().toString(),
      type: new mongoose.Types.ObjectId().toString(), // debe ser un ObjectId
      status: 1, // numérico, no string
      avgEggWeight: 62,
      netWeight: 23.5,
      grossWeight: 25.0,
      shedNumber: 1,
      farmNumber: 2
    })

    expect(response.status).toBe(201)
    expect(response.body.code).toBe(uniqueCode)
    boxId = response.body._id
  })

  it('debe registrar un envío con la caja', async () => {
    const response = await request(app).post('/api/shipment').send({
      driver: 'Test Driver',
      plates: 'ABC123',
      responsible: 'Test Integration',
      vehiclePlates: 'ABC123',
      createdBy: new mongoose.Types.ObjectId().toString(),
      lastUpdateBy: new mongoose.Types.ObjectId().toString(),
      shipmentId: uniqueShipmentId,
      summary: {
        totalBoxes: 1,
        totalEggs: 360,
        totalNetWeight: 23.5,
        totalByCategory: {
          A: {
            count: 1,
            totalEggs: 360,
            totalNetWeight: 23.5
          }
        }
      },
      codes: [{ codeId: boxId, code: uniqueCode }],
      date: new Date()
    })

    expect(response.status).toBe(201)
    expect(response.body.codes[0].code).toBe(uniqueCode)
  })

  it('debe registrar la venta de la caja', async () => {
    const response = await request(app).post('/api/sale').send({
      clientId: new mongoose.Types.ObjectId().toString(),
      sellerUserId: new mongoose.Types.ObjectId().toString(),
      codes: [uniqueCode],
      paymentType: 'contado',
      paymentMethod: 'efectivo',
      reference: 'Venta integración test',
      amountPending: 0,
      totalWithIva: 500,
      iva: 80,
      subtotal: 420,
      pricePerKg: 20,
      totalKg: 25,
      totalBoxes: 1,
      folio: 'VENTATEST-' + Date.now(),
      date: new Date(),
      pricesByCategory: { A: 25 }
    })


    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('folio')
  })

})
