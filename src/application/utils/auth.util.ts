import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
/* consts */
import { rounds } from '@app/constants/auth.constants'
import { customLog } from './util.util'

export function generatePasswordHash(password: string): string {
  const salt: string = bcrypt.genSaltSync(rounds)
  const hash: string = bcrypt.hashSync(password, salt)
  return hash
}

export function comparePassword(password: string, hashPassword: string): boolean {
  return bcrypt.compareSync(password, hashPassword)
}

export const generateUserToken = (user: any) => {
  const token = jwt.sign(
    { id: user._id.toString(), role: user.roleId.toString() },
    process.env.JWT_SECRET || "supersecreto",
    { expiresIn: "30s" }
  );

  customLog("🔵 Token generado:", token); // <-- Agregar este log

  const refreshToken = jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_REFRESH_SECRET || "refresh supersecreto",
    { expiresIn: "7d" }
  );
  customLog("🔵 RefreshToken generado:", refreshToken);
  return { token, refreshToken, expiresIn: 30 };
};


export function verifyUserToken<T>(token: string): T {
  return jwt.verify(token, process.env.USER_JWT_SIGNATURE ?? '') as T
}
