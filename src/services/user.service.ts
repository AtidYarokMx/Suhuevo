import { AppErrorResponse } from '@app/models/app.response'
import { type IUser } from '@app/dtos/user.dto'
import { type ClientSession, type FilterQuery } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { customLog } from '@app/utils/util.util'
import { generatePasswordHash } from '@app/utils/auth.util'
import { UserModel } from '@app/repositories/mongoose/models/user.model'

class UserService {
  searchFieldsBlacklist: string[] = ['password']
  searchOperators: string[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'sta', 'end']
  searchFilters: any = {

  }

  async getUser (id: string): Promise<any> {
    const user = await UserModel.findOne({ _id: id })
    return user
  }

  async getUsers (idsArray: string[]): Promise<any> {
    const response: any = {}
    for (const id of idsArray) {
      try {
        const user = await UserModel.findOne({ _id: id })
        response[id] = user
      } catch (error) { continue }
    }
    return response
  }

  async searchUser (value: any, fieldName: string = '_id', operator: string = 'eq'): Promise<any> {
    if (!this.searchFieldsBlacklist.includes(fieldName)) throw new AppErrorResponse({ statusCode: 403, name: 'Invalid field to search' })
    if (!this.searchOperators.includes(operator)) throw new AppErrorResponse({ statusCode: 403, name: 'Invalid operator' })

    let filter: FilterQuery<IUser> = { fieldName: '' }

    switch (operator) {
      case 'eq' : filter[fieldName] = value; break
      case 'neq': filter[fieldName] = { $neq: value }; break
      case 'gt' : filter[fieldName] = { $gt: value }; break
      case 'gte': filter[fieldName] = { $gte: value }; break
      case 'lt' : filter[fieldName] = { $lt: value }; break
      case 'lte': filter[fieldName] = { $lte: value }; break
      case 'sta': filter[fieldName] = { $regex: `^${value as string}` }; break
      case 'end': filter[fieldName] = { $regex: `${value as string}$` }; break
      default: filter = { [fieldName]: value }
    }

    try {
      const user = await UserModel.find(filter)
      return user
    } catch (error: any) {
      throw new AppErrorResponse({ statusCode: 500, name: 'Database error', message: error.message })
    }
  }

  async create (body: any, session: ClientSession): Promise<any> {
    const id = uuidv4()

    const password = generatePasswordHash(body.password)

    const user = new UserModel({ ...body, id, password })
    customLog(`Creando usuario ${String(user.id)} (${String(user.name)})`)
    await user.save({ session })

    return { userId: user.id }
  }

  async update (body: any, session: ClientSession): Promise<any> {
    const userFound = await UserModel.findOne({ _id: body._id })
    if (userFound == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el usuario' })

    const allowedFields = [
      'name',
      'firstLastName',
      'secondLastName',
      'accountType',
      'phone',
      'email',
      'status'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (userFound as any)[field] = body[field]
      }
    }

    await userFound.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return 'Success'
  }
}

const userService: UserService = new UserService()
export default userService
