import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "@app/repositories/mongoose/models/user.model";
import { Role } from "@app/repositories/mongoose/models/role.model";

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error("❌ ERROR: No se ha definido JWT_SECRET en las variables de entorno.");
  process.exit(1); // 🚀 Detener la ejecución si no hay una clave segura
}

// 🛑 Rutas públicas (sin autenticación)
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
 * Permite autenticación vía `Authorization` o `Cookies`
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next(); // ✅ Saltar autenticación en rutas públicas
  }
  if (process.env.NODE_ENV === 'test') {
    return next(); // 🔓 Omitir autenticación durante pruebas
  }

  let token = req.headers.authorization?.split(" ")[1] || req.cookies?.user; // 🔹 Permitir autenticación por header y cookies

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
    console.error("❌ Error de autenticación:", error);
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
      console.error("❌ Error en autorización de roles:", error);
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
      // 🚀 Obtener el rol y permisos en una sola consulta para optimizar
      const userWithRole = await UserModel.findById(user.id)
        .populate({
          path: "roleId",
          populate: { path: "permissions", model: "Permission" }
        })
        .lean();

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

      // ✅ Verificar si el usuario tiene TODOS los permisos requeridos
      const hasPermission = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        return res.status(403).json({ message: "No tienes permisos para acceder a esta ruta" });
      }

      next();
    } catch (error) {
      console.error("❌ Error en autorización de permisos:", error);
      return res.status(403).json({ message: "Error al verificar permisos" });
    }
  };
};
