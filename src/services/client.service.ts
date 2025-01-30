/* lib */
import { z } from 'zod'
import { type ClientSession } from 'mongoose'
/* models */
import { ClientModel } from '@app/repositories/mongoose/models/client.model'
/* app models */
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import { AppLocals } from '@app/interfaces/auth.dto'
import { createClientBody, updateClientBody } from '@app/dtos/client.dto'


class ClientService {
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

  async create(body: z.infer<typeof createClientBody>, session: ClientSession, locals: AppLocals) {
    const user = locals.user._id
    const client = new ClientModel({ ...body, createdBy: user, lastUpdateBy: user })
    const saved = await client.save({ session, validateBeforeSave: true })
    return saved.toJSON()
  }

  async update(_id: string, body: z.infer<typeof updateClientBody>, session: ClientSession, locals: AppLocals) {
    const client = await ClientModel.findOne({ active: true, _id }).exec()
    if (client == null) throw new AppErrorResponse({ statusCode: 404, name: "Cliente no encontrado", description: "El cliente ingresado es inexistente en el sistema o fue eliminado" })
    const user = locals.user._id
    client.set({ ...body, lastUpdateBy: user })
    const updated = await client.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return updated.toJSON()
  }
}

const clientService: ClientService = new ClientService()
export default clientService
