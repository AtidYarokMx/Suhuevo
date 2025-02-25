/* lib */
import { v4 as uuidv4 } from 'uuid'
/* models */
import { UserModel } from '@app/repositories/mongoose/models/user.model'
import { ResetModel } from '@app/repositories/mongoose/models/reset.model'
/* response models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { comparePassword, generatePasswordHash, generateUserToken } from '@app/utils/auth.util'
/* dtos */
import { IResetPasswordBody, IUpdatePasswordBody } from '@app/dtos/reset-pass.dto'
import { ClientSession } from 'mongoose'
import { appMailTransporter } from '@app/repositories/nodemailer'
import { appBaseUri, appFrontUpdatePasswordUri, appMailSender } from '@app/constants/mail.constants'

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
    const uuid = uuidv4()
    await ResetModel.create([{ uuid, user: user._id }], { session })
    await appMailTransporter.sendMail({
      from: appMailSender,
      to: user.email,
      subject: 'Reestablecer contraseña',
      templateName: "reset-password",
      templateData: {
        userName: user.name,
        linkUrl: `${appFrontUpdatePasswordUri}/${uuid}`,
        logoUrl: `${appBaseUri}:60102/public/logo_1.png`,
      }
    })
    return { message: "Correo enviado con éxito" }
  }

  async updatePassword(body: IUpdatePasswordBody, session: ClientSession) {
    if (body.newPassword !== body.confirmNewPassword) throw new AppErrorResponse({ statusCode: 404, name: 'Las contraseñas no coinciden' })
    const code = await ResetModel.findOne({ uuid: body.uuid, active: true }, null, { session }).populate("user").exec()
    if (code == null) throw new AppErrorResponse({ statusCode: 404, name: 'El código no existe o ha expirado' })
    const password = generatePasswordHash(body.newPassword)
    await UserModel.updateOne({ _id: code.user._id }, { password }, { session }).exec()
    code.active = false
    const updated = await code.save()
    return updated.toJSON()
  }
}

const authService: AuthService = new AuthService()
export default authService
