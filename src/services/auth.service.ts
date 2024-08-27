/* models */
import { AppErrorResponse } from '@app/models/app.response'
import { v4 as uuidv4 } from 'uuid'
/* utils */
import { comparePassword, generateUserToken } from '@app/utils/auth.util'
import { UserModel } from '@app/repositories/mongoose/models/user.model'
import { SessionModel } from '@app/repositories/mongoose/models/session.model'
/* dtos */

class AuthService {
  // async createUser (body: any, locals: any, session: any): Promise<any> {
  //   const { email, password } = body
  //   const exists = await UserModel.exists({ email, active: true })
  //   if (exists != null) throw new AppErrorResponse({ statusCode: 409, name: 'El correo ya está registrado', isOperational: true })

  //   const id = uuidv4()
  //   const user = new UserModel({ email, password: generatePassword(password), accountType: 1, id })
  //   const saved = await user.save({ session, validateBeforeSave: true, validateModifiedOnly: true })

  //   const { token, expiresIn } = generateUserToken({
  //     _id: saved._id,
  //     id: saved.id,
  //     role: saved.role
  //   })

  //   const { refreshToken, expiryDate } = generateRefreshToken()
  //   const refreshExpiresIn = expiryDate.getTime()

  //   const accountSession = new SessionModel({
  //     user: user._id,
  //     refreshToken,
  //     expiryDate: refreshExpiresIn,
  //     client: locals.device.client,
  //     device: locals.device.device,
  //     os: locals.device.os,
  //     ipAddress: locals.ipAddress
  //   })

  //   await accountSession.save({ validateBeforeSave: true, session })

  //   return { token, refreshToken, expiresIn, refreshExpiresIn, expiryDate }
  // }

  async login (body: any, locals: any, session: any): Promise<any> {
    const user = await UserModel.findOne({ userName: body.userName, active: true }, undefined, { session })
    if (user == null) throw new AppErrorResponse({ statusCode: 404, name: 'Credenciales incorrectas', isOperational: true })

    const valid = comparePassword(body.password, user.password)
    if (!valid) throw new AppErrorResponse({ statusCode: 401, name: 'Credenciales incorrectas', isOperational: true })

    const { token, expiresIn } = generateUserToken({
      id: user.id,
      name: user.name,
      firstLastName: user.firstLastName,
      secondLastName: user.secondLastName,
      role: user.role
    })

    const accountSession = new SessionModel({
      id: uuidv4(),
      user: user._id,
      client: locals.device.client,
      device: locals.device.device,
      os: locals.device.os,
      ipAddress: locals.ipAddress
    })

    await accountSession.save({ validateBeforeSave: true, session })

    return { token, expiresIn }
  }
}

const authService: AuthService = new AuthService()
export default authService
