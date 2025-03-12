import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
/* consts */
import { rounds } from '@app/constants/auth.constants'
import { customLog } from './util.util'
import { RefreshTokenModel } from '@app/repositories/mongoose/models/refreshtoken.model'

export function generatePasswordHash(password: string): string {
  const salt: string = bcrypt.genSaltSync(rounds)
  const hash: string = bcrypt.hashSync(password, salt)
  return hash
}

export function comparePassword(password: string, hashPassword: string): boolean {
  return bcrypt.compareSync(password, hashPassword)
}

export const generateUserToken = async (user: any) => {
  try {
    const expiresIn = 3600; // 1 hora
    const refreshExpiresIn = 604800; // 7 días

    const token = jwt.sign(
      { id: user._id.toString(), role: user.roleId.toString() },
      process.env.JWT_SECRET || "supersecreto",
      { expiresIn }
    );

    customLog("🔵 Token generado:", token);

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || "refreshsupersecreto",
      { expiresIn: refreshExpiresIn }
    );

    // ✅ Guardar o actualizar el refresh token en la base de datos
    await RefreshTokenModel.findOneAndUpdate(
      { userId: user._id },
      { token: refreshToken, expiresAt: new Date(Date.now() + refreshExpiresIn * 1000) },
      { upsert: true, new: true, maxTimeMS: 10000 }
    );

    customLog("🔵 RefreshToken generado y almacenado en la BD:", refreshToken);

    return { token, refreshToken, expiresIn, refreshExpiresIn };
  } catch (error) {
    customLog("🔴 ERROR al generar token:", error);
    throw new Error("Error al generar los tokens");
  }
};



export function verifyUserToken<T>(token: string): T {
  return jwt.verify(token, process.env.USER_JWT_SIGNATURE ?? '') as T
}
