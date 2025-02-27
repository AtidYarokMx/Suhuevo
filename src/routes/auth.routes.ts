import { Router } from "express";
import { authController } from "@controllers/auth.controller";
import { authenticateUser } from "@middlewares/auth.middleware";
import { validateLogin, validateResetPassword, validateUpdatePassword } from "@validations/auth.validation";
import { ServerRouter } from "./models/route";

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para autenticación y gestión de usuarios.
 */

class AuthRoutes extends ServerRouter {
  constructor() {
    super();
    this.config();
  }

  private config(): void {
    this.router = Router();

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Iniciar sesión
     *     description: Autentica a un usuario con email y contraseña, devolviendo un token de acceso y un refresh token.
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
     *                 example: "SuperSecreta123!"
     *     responses:
     *       200:
     *         description: Autenticación exitosa.
     *       400:
     *         description: Email y contraseña son obligatorios.
     *       401:
     *         description: Credenciales incorrectas.
     */
    this.router.post("/login", validateLogin, authController.login);

    /**
     * @swagger
     * /api/auth/refresh:
     *   post:
     *     summary: Renovar token de sesión
     *     description: Obtiene un nuevo token de acceso usando un refresh token.
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Token renovado exitosamente.
     *       401:
     *         description: Token de refresco no proporcionado o inválido.
     */
    this.router.post("/refresh", authController.refreshToken);

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Cerrar sesión
     *     description: Invalida el token de refresco y cierra la sesión del usuario.
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Sesión cerrada exitosamente.
     *       401:
     *         description: Token de refresco no proporcionado.
     */
    this.router.post("/logout", authController.logout);

    /**
    * @swagger
    * /api/auth/reset-password:
    *   post:
    *     summary: Solicitar restablecimiento de contraseña
    *     description: Envía un correo para restablecer la contraseña del usuario.
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
    */
    this.router.post("/reset-password", validateResetPassword, authController.resetPassword);

    /**
     * @swagger
     * /api/auth/update-password:
     *   post:
     *     summary: Actualizar contraseña
     *     description: Permite al usuario cambiar su contraseña después de restablecerla.
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
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
     */
    this.router.post("/update-password", validateUpdatePassword, authController.updatePassword);
  }
}

export const authRoutes = new AuthRoutes().router;
