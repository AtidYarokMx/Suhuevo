import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppErrorResponse } from "@app/models/app.response";
import { UserModel } from "@app/repositories/mongoose/models/user.model";
import { Role } from "@app/repositories/mongoose/models/role.model";

const SECRET_KEY = process.env.JWT_SECRET || "supersecreto";

// 🛑 Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/reset-password",
  "/api/docs",
  "/api/docs-json"
];

/**
 * Middleware de Autenticación 🔒
 * Verifica si el usuario está autenticado, excepto en rutas públicas.
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next(); // ✅ Saltar autenticación en rutas públicas
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    const user = await UserModel.findById(decoded.id).select("-password"); // 🔥 No traer password

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    res.locals.user = user; // Guardar usuario en `res.locals`
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

/**
 * Middleware de Autorización por Rol 🎭
 * Permite acceso solo a usuarios con roles específicos.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    if (!user || !user.roleId) {
      return res.status(403).json({ message: "Acceso restringido: No tienes rol asignado" });
    }

    try {
      const role = await Role.findById(user.roleId);
      if (!role || !allowedRoles.includes(role.name)) {
        return res.status(403).json({ message: "No tienes permisos suficientes para acceder a esta ruta" });
      }

      next();
    } catch (error) {
      console.error("🔴 Error en autorización de roles:", error);
      return res.status(403).json({ message: "Error al verificar rol" });
    }
  };
};

/**
 * Middleware de Autorización por Permisos 🎯
 * Verifica si el usuario tiene permisos específicos dentro de su rol.
 */
export const authorizePermissions = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    try {
      // 🚀 Poblar rol y permisos solo cuando se necesita
      const userWithRole = await UserModel.findById(user.id)
        .populate({
          path: "roleId",
          populate: { path: "permissions", model: "Permission" }
        })
        .exec();

      if (!userWithRole || !userWithRole.roleId) {
        return res.status(403).json({ message: "No tienes un rol asignado" });
      }

      // ✅ Extraer permisos del rol
      const role = userWithRole.roleId as any;
      if (!role.permissions || !Array.isArray(role.permissions)) {
        return res.status(403).json({ message: "El rol no tiene permisos asignados" });
      }

      const userPermissions = role.permissions.map((p: any) => p.code);
      console.log("🔹 Permisos del usuario:", userPermissions);

      // ✅ Verificar permisos requeridos
      const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        return res.status(403).json({ message: "No tienes permisos para acceder a esta ruta" });
      }

      next();
    } catch (error) {
      console.error("🔴 Error en autorización de permisos:", error);
      return res.status(403).json({ message: "Error al verificar permisos" });
    }
  };
};
