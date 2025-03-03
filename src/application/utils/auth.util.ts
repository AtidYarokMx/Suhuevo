import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
/* consts */
import { refreshExpiresIn, rounds } from '@app/constants/auth.constants'
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
  const payload = {
    id: user._id.toString(),
    role: user.roleId.toString(),
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || "supersecreto", {
    expiresIn: "1h",
  });

  customLog("🔵 Token generado:", token);

  const refreshTokenPayload = {
    id: user._id.toString(),
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.JWT_REFRESH_SECRET || "refreshsupersecreto",
    { expiresIn: "7d" }
  );

  customLog("🔵 RefreshToken generado:", refreshToken);

  return { token, refreshToken, expiresIn: 3600, refreshExpiresIn: 604800 };
};


export function verifyUserToken<T>(token: string): T {
  return jwt.verify(token, process.env.USER_JWT_SIGNATURE ?? '') as T
}
