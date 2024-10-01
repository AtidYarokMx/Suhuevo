/* lib */
import { v4 as uuidv4 } from 'uuid'
/* models */
import { UserModel } from '@app/repositories/mongoose/models/user.model'
import { ResetModel } from '@app/repositories/mongoose/models/reset.model'
/* response models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { comparePassword, generateUserToken } from '@app/utils/auth.util'
/* dtos */
import { IResetPasswordBody } from '@app/dtos/reset-pass.dto'
import { ClientSession } from 'mongoose'
import { appMailTransporter } from '@app/repositories/nodemailer'
import { appMailSender } from '@app/constants/mail.constants'

class AuthService {
  async login(body: any, locals: any, session: any): Promise<any> {
    console.log(body)
    const userName = body.userName ?? body.email
    const user = await UserModel.findOne({ userName, active: true }, undefined, { session })
    if (user == null) throw new AppErrorResponse({ statusCode: 404, name: 'Credenciales incorrectas*', isOperational: true })

    const valid = comparePassword(body.password, user.password)
    if (!valid) throw new AppErrorResponse({ statusCode: 401, name: 'Credenciales incorrectas', isOperational: true })

    const { token, expiresIn } = generateUserToken({
      _id: user._id,
      id: user.id,
      email: user.email,
      name: user.name,
      firstLastName: user.firstLastName,
      secondLastName: user.secondLastName,
      role: user.role,
      phone: user.phone
    })

    // const accountSession = new SessionModel({
    //   id: uuidv4(),
    //   user: user._id,
    //   client: locals.device.client,
    //   device: locals.device.device,
    //   os: locals.device.os,
    //   ipAddress: locals.ipAddress
    // })

    // await accountSession.save({ validateBeforeSave: true, session })

    return { token, expiresIn }
  }

  async resetPassword(body: IResetPasswordBody, session: ClientSession) {
    const user = await UserModel.findOne({ email: body.email }, null, { session })
    if (user == null) throw new AppErrorResponse({ statusCode: 404, name: 'Usuario no encontrado' })
    await ResetModel.create([{ uuid: uuidv4(), user: user._id }], { session })
    await appMailTransporter.sendMail({
      from: appMailSender,
      to: user.email,
      subject: 'Reestablecer contraseña',
      text: "Olvidaste tu contraseña mi estimado (esto es una prueba, ignorar)"
    })
    return { message: "Correo enviado con éxito" }
  }
}

const authService: AuthService = new AuthService()
export default authService
