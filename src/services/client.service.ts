/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { ClientModel } from '@app/repositories/mongoose/models/client.model'
/* dtos */
import { IClient } from '@app/dtos/client.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AppLocals } from '@app/interfaces/auth.dto'


class ShedService {
  async getOne(_id: string) {
    const client = await ClientModel.findOne({ _id, active: true }).exec()

    if (client == null)
      throw new AppErrorResponse({ name: "Client Not Found", statusCode: 404, code: "ClientNotFound", description: "No se encontró el cliente solicitado", message: "No se encontró el cliente solicitado" })

    return client
  }

  async getAll() {
    const clients = await ClientModel.find({ active: true }).exec()
    return clients
  }
}

const shedService: ShedService = new ShedService()
export default shedService
