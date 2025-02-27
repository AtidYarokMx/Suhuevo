import { type Types } from 'mongoose'

/**
 * 📌 Enum de errores de autenticación.
 * Se usa para manejar errores comunes al iniciar sesión.
 */
export enum EAuthAttemptErrors {
  /** Error cuando la contraseña no cumple con las reglas de seguridad */
  INVALID_PASSWORD_FORMAT = 'La contraseña no cumple con las siguientes reglas: [1 mayúscula, 1 minúscula, 1 símbolo, mínimo de 8 caractéres]',
  /** Error cuando se superan los intentos máximos de login */
  MAX_LOGIN_ATTEMPTS = 'Has intentado iniciar sesión varias veces. Prueba nuevamente en 30 minutos.',
}

/**
 * 📌 Interfaz para el Token de Refresco.
 * Se usa para manejar tokens de sesión a largo plazo.
 */
export interface IRefreshToken {
  /** Token de refresco */
  refreshToken: string;
  /** Fecha de expiración del token */
  expiryDate: Date;
}

/**
 * 📌 Interfaz para el Token de Cuenta.
 * Representa el token de acceso y su duración.
 */
export interface IAccountToken {
  /** Token de acceso */
  token: string;
  /** Tiempo de expiración en segundos */
  expiresIn: number;
}

/**
 * 📌 Datos del usuario autenticado en sesión.
 * Se usa en `res.locals.user` dentro de Express.
 */
export interface IUserPayload {
  _id: Types.ObjectId;
  id: string;
  name: string;
  firstLastName: string;
  email: string;
  roleId: Types.ObjectId;
  /* Opcionales */
  secondLastName?: string;
  phone?: string;
  /* Avatar del usuario */
  avatar?: string;
}

/**
 * 📌 Datos almacenados en `res.locals` en cada request autenticada.
 * Permite acceder a la información del usuario en los middlewares.
 */
export type AppLocals = {
  user: IUserPayload;
};
