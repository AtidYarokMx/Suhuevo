/* Libs */
import { v4 as uuidv4 } from "uuid";
/* Models */
import { UserModel } from "@app/repositories/mongoose/models/user.model";
import { RefreshTokenModel } from "@app/repositories/mongoose/models/refreshtoken.model";
import { ResetModel } from "@app/repositories/mongoose/models/reset.model";
/* Response Models */
import { AppErrorResponse } from "@app/models/app.response";
/* Utils */
import { comparePassword, generatePasswordHash, generateUserToken } from "@app/utils/auth.util";
/* DTOs */
import { IResetPasswordBody, IUpdatePasswordBody } from "@app/dtos/reset-pass.dto";
import { ClientSession } from "mongoose";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import { appMailTransporter } from "@app/repositories/nodemailer";
import { appBaseUri, appFrontUpdatePasswordUri, appMailSender } from "@app/constants/mail.constants";
import { customLog } from "@app/utils/util.util";
import { refreshExpiresIn } from "@app/constants/auth.constants";


class AuthService {

  /**
   * Iniciar sesión con Refresh Token
   *    
   */
  async login(body: any, locals: any, session: any): Promise<any> {
    customLog("🛠️ Iniciando autenticación para:", body.email);
    const userName = body.email

    try {
      // ✅ Si no se proporciona email o contraseña, devolver error de validación
      if (!body.email || !body.password) {
        throw new AppErrorResponse({
          statusCode: 400,
          name: "Error de validación",
          message: "Email y contraseña son obligatorios",
          isOperational: true
        });
      }

      const rt = await RefreshTokenModel.findOne({
        token: "testToken"
      },
        null,
        { session });

      customLog("test", rt)


      // ✅ Buscar usuario en la base de datos
      const user = await UserModel.findOne({
        userName: userName,
        active: true
      },
        null,
        { session });

      if (!user) {
        customLog("❌ Usuario no encontrado.");
        throw new AppErrorResponse({
          statusCode: 401,
          name: "Credenciales incorrectas",
          message: "Usuario o contraseña incorrectos",
          isOperational: true
        });
      }

      customLog("📡 Usuario encontrado:", user);

      const valid = comparePassword(body.password, user.password);
      customLog("🔍 ¿Contraseña válida?", valid);

      if (!valid) {
        customLog("❌ Contraseña incorrecta.");
        throw new AppErrorResponse({
          statusCode: 401,
          name: "Credenciales incorrectas",
          message: "Usuario o contraseña incorrectos",
          isOperational: true
        });
      }

      customLog("✅ Autenticación exitosa. Generando token...");

      const { token, refreshToken, expiresIn, refreshExpiresIn } = generateUserToken(user);

      const existingToken = await RefreshTokenModel.findOne({ userId: user._id });

      if (existingToken) {
        await RefreshTokenModel.updateOne(
          { userId: user._id },
          { token: refreshToken, expiresAt: refreshExpiresIn },
          { upsert: true }
        );
      } else {
        await RefreshTokenModel.create({
          userId: user._id,
          token: refreshToken,
          expiresAt: refreshExpiresIn
        });
      }

      return { token, refreshToken, expiresIn, refreshExpiresIn };
    } catch (error) {
      customLog("🔴 ERROR en login:", error);
      throw error
    }
  }


  /**
   * Refrescar Token de Acceso
   */
  async refreshToken(refreshToken: string, session: ClientSession) {
    if (!refreshToken) {
      throw new AppErrorResponse({ statusCode: 403, name: "Token de refresco requerido" });
    }

    try {
      customLog("🔍 Verificando Refresh Token...");

      // ✅ 1. Verificar si el refreshToken es válido y obtener `decoded`
      let decoded: JwtPayload;
      try {
        decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refreshsupersecreto") as JwtPayload;
        customLog("🔍 Decoded RefreshToken:", decoded);
      } catch (error) {
        throw new AppErrorResponse({ statusCode: 401, name: "Refresh token inválido o expirado" });
      }

      // ✅ 2. Verificar si el refreshToken ha expirado
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new AppErrorResponse({ statusCode: 401, name: "Refresh token expirado" });
      }

      // ✅ 3. Buscar el usuario
      customLog("✅ Token válido. Buscando usuario...");
      const user = await UserModel.findById(decoded.id).session(session);
      if (!user) {
        throw new AppErrorResponse({ statusCode: 403, name: "Usuario no encontrado" });
      }

      // ✅ 4. Buscar el Refresh Token en la BD
      customLog("🔍 Buscando token en la base de datos...");
      const storedToken = await RefreshTokenModel.findOne({ userId: decoded.id, token: refreshToken }).session(session);
      if (!storedToken) {
        throw new AppErrorResponse({ statusCode: 403, name: "Refresh token no encontrado en la base de datos" });
      }

      // ✅ 5. Generar nuevos tokens
      customLog("🔄 Generando nuevo token...");
      const { token, refreshToken: newRefreshToken, expiresIn, refreshExpiresIn } = generateUserToken(user);

      // ✅ 6. Actualizar el Refresh Token en la BD en una sola operación
      customLog("🔄 Actualizando refreshToken en la base de datos...");
      await RefreshTokenModel.findOneAndUpdate(
        { token: refreshToken },
        { token: newRefreshToken, expiresAt: new Date(Date.now() + refreshExpiresIn * 1000) },
        { upsert: true, new: true, session, maxTimeMS: 15000 }
      );

      return { token, refreshToken: newRefreshToken, expiresIn, refreshExpiresIn };
    } catch (error) {
      customLog("🔴 Error al renovar token:", error);
      throw new AppErrorResponse({ statusCode: 401, name: "Refresh token inválido o expirado" });
    }
  }


  /**
   * Cerrar sesión y eliminar Refresh Token
   */
  async logout(refreshToken: string) {
    customLog("Token Recibido", refreshToken)
    await RefreshTokenModel.findOneAndDelete({ token: refreshToken });
    return { message: "Sesión cerrada exitosamente" };
  }

  /**
   * Enviar correo para restablecer contraseña
   */
  async resetPassword(body: IResetPasswordBody, session: ClientSession) {
    const user = await UserModel.findOne({ email: body.email }, null, { session });

    if (!user) {
      throw new AppErrorResponse({ statusCode: 404, name: "Usuario no encontrado" });
    }

    const uuid = uuidv4();
    await ResetModel.create([{ uuid, user: user._id }], { session });

    await appMailTransporter.sendMail({
      from: appMailSender,
      to: user.email,
      subject: "Restablecer contraseña",
      templateName: "reset-password",
      templateData: {
        userName: user.name,
        linkUrl: `${appFrontUpdatePasswordUri}/${uuid}`,
        logoUrl: `${appBaseUri}:60102/public/logo_1.png`,
      },
    });

    return { message: "Correo enviado para restablecer contraseña" };
  }

  /**
   * Actualizar contraseña desde el formulario de restablecimiento
   */
  async updatePassword(body: IUpdatePasswordBody, session: ClientSession) {
    if (body.newPassword !== body.confirmNewPassword) {
      throw new AppErrorResponse({ statusCode: 400, name: "Las contraseñas no coinciden" });
    }

    const resetRequest = await ResetModel.findOne({ uuid: body.uuid, active: true }, null, { session })
      .populate("user")
      .exec();

    if (!resetRequest) {
      throw new AppErrorResponse({ statusCode: 404, name: "El código no existe o ha expirado" });
    }

    const hashedPassword = await generatePasswordHash(body.newPassword);
    await UserModel.updateOne({ _id: resetRequest.user._id }, { password: hashedPassword }, { session }).exec();

    resetRequest.active = false;
    await resetRequest.save();

    return { message: "Contraseña actualizada exitosamente" };
  }

}

const authService: AuthService = new AuthService();
export default authService;
