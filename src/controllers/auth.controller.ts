import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { AppMainMongooseRepo } from "@app/repositories/mongoose";
import authService from "../services/auth.service";
import { appErrorResponseHandler } from "@app/handlers/response/error.handler";
import { IResetPasswordBody, IUpdatePasswordBody } from "@app/dtos/reset-pass.dto";
import { customLog } from "@app/utils/util.util";
import { refreshExpiresIn } from "@app/constants/auth.constants";

class AuthController {
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Iniciar sesión
   *     description: Autentica al usuario y genera tokens de acceso y refresco.
   *     tags: [Autenticación]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 example: usuario@example.com
   *               password:
   *                 type: string
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: Inicio de sesión exitoso.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 token:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *       401:
   *         description: Credenciales incorrectas.
   *       500:
   *         description: Error en el servidor.
   */
  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const session = await AppMainMongooseRepo.startSession();

    try {
      session.startTransaction();
      const response = await authService.login(req.body, res.locals, session);
      await session.commitTransaction();
      res
        .cookie("refresh-token", response.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict"
        })
        .status(200)
        .json({ success: true, ...response });
    } catch (error) {
      await session.abortTransaction();

      customLog("🔴 Error al iniciar sesión:", error)
      const { statusCode, error: err } = appErrorResponseHandler(error);
      res.status(statusCode).json({ success: false, error: err });
    } finally {
      await session.endSession();
    }
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refrescar el token de acceso
   *     description: Genera un nuevo token de acceso utilizando el refresh token.
   *     tags: [Autenticación]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Token renovado exitosamente.
   *       401:
   *         description: Token inválido o expirado.
   */
  public refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token = req.headers["x-refresh-token"] as string;

    if (!token) {
      res.status(401).json({ success: false, message: "No se proporcionó un token de refresco" });
      return;
    }

    const session = await AppMainMongooseRepo.startSession();
    try {
      session.startTransaction();
      const response = await authService.refreshToken(token, session);
      await session.commitTransaction();

      res
        .cookie("session", response.token, {
          httpOnly: true,
          secure: true,
          sameSite: "strict"
        })
        .cookie("refresh-token", response.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict"
        })
        .status(200)
        .json({
          success: true,
          message: "Token renovado exitosamente",
          token: response.token,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          refreshExpiresIn: response.refreshExpiresIn
        });

    } catch (error) {
      await session.abortTransaction();
      customLog("🔴 Error al refrescar token:", error);

      const { statusCode, error: err } = appErrorResponseHandler(error);
      res.status(statusCode).json({ success: false, error: err });
    } finally {
      await session.endSession();
    }
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Cerrar sesión
   *     description: Elimina el refresh token y cierra la sesión del usuario.
   *     tags: [Autenticación]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sesión cerrada exitosamente.
   *       401:
   *         description: Token no proporcionado.
   */
  public logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.headers["x-refresh-token"] as string;

    if (!refreshToken) {
      res.status(401)
        .json({
          success: false,
          message: "No se proporcionó un token de refresco"
        });
      return;
    }

    try {
      await authService.logout(refreshToken);
      res
        .clearCookie("session")
        .clearCookie("refresh-token")
        .status(200)
        .json({
          success: true,
          message: "Sesión cerrada exitosamente"
        });
    } catch (error) {
      customLog("🔴 Error en logout:", error);

      const { statusCode, error: err } = appErrorResponseHandler(error);
      res.status(statusCode).json({ success: false, error: err });
    }
  });

  /**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Envía un correo con un enlace para restablecer la contraseña.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@example.com
 *     responses:
 *       200:
 *         description: Correo enviado para restablecer la contraseña.
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error en el servidor.
 */
  public resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const session = await AppMainMongooseRepo.startSession();

    try {
      session.startTransaction();
      await authService.resetPassword(req.body as IResetPasswordBody, session);
      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: "Correo enviado para restablecer contraseña"
      });

    } catch (error) {
      await session.abortTransaction();
      customLog("🔴 Error en resetPassword:", error)

      const { statusCode, error: err } = appErrorResponseHandler(error);
      res.status(statusCode).json({ success: false, error: err });
    } finally {
      await session.endSession();
    }
  });

  /**
 * @swagger
 * /api/auth/update-password:
 *   post:
 *     summary: Actualizar contraseña
 *     description: Permite al usuario cambiar su contraseña después de restablecerla.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uuid, newPassword, confirmNewPassword]
 *             properties:
 *               uuid:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               newPassword:
 *                 type: string
 *                 example: "NuevaContraseña123!"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "NuevaContraseña123!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente.
 *       400:
 *         description: Las contraseñas no coinciden.
 *       404:
 *         description: Código de restablecimiento inválido o expirado.
 *       500:
 *         description: Error en el servidor.
 */
  public updatePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const session = await AppMainMongooseRepo.startSession();

    try {
      session.startTransaction();
      await authService.updatePassword(req.body as IUpdatePasswordBody, session);
      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente"
      });

    } catch (error) {
      await session.abortTransaction();
      customLog("🔴 Error en updatePassword:", error);

      const { statusCode, error: err } = appErrorResponseHandler(error);
      res.status(statusCode).json({ success: false, error: err });
    } finally {
      await session.endSession();
    }
  });
}

export const authController: AuthController = new AuthController();
