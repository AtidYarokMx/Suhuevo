import { Request, Response, NextFunction } from "express";
import { AuditLog } from "@app/repositories/mongoose/models/audit.model";
import { customLog } from "@app/utils/util.util";

export const globalAuditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!["POST", "PUT", "DELETE"].includes(req.method) || !res.locals.user) {
    return next(); // ⏭️ Omitimos GET y peticiones sin usuario autenticado
  }

  const startTime = Date.now();

  res.on("finish", async () => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) { // ✅ Solo registramos respuestas exitosas
        const logData = {
          userId: res.locals.user._id.toString(), // Usuario responsable
          collectionName: req.baseUrl.split("/").pop() || "unknown",
          documentId: req.params.id || "unknown",
          action: req.method === "POST" ? "CREATE" : req.method === "PUT" ? "UPDATE" : "DELETE",
          changes: req.method === "PUT" ? extractChanges(req, res) : req.body, // Solo cambios en UPDATE
          ipAddress: req.ip, // 🔍 IP del usuario
          userAgent: req.headers["user-agent"] || "unknown", // 🔍 Dispositivo/Navegador
          responseTime: Date.now() - startTime, // ⏳ Tiempo de ejecución
          timestamp: new Date(),
        };

        // 📝 Guardar la auditoría de manera asíncrona sin bloquear la respuesta
        AuditLog.create(logData).catch(error => {
          console.error("❌ Error en auditoría:", error);
        });

        customLog("✅ Auditoría registrada:", logData);
      }
    } catch (error) {
      console.error("Error en auditoría:", error);
    }
  });

  next();
};

/**
 * 📌 Extrae solo los cambios en una actualización (PUT)
 */
const extractChanges = (req: Request, res: Response) => {
  if (!req.body || !res.locals?.originalDocument) return req.body;

  const changes: any = {};
  const original = res.locals.originalDocument.toObject();
  const updated = req.body;

  Object.keys(updated).forEach(key => {
    if (original[key] !== updated[key]) {
      changes[key] = { before: original[key], after: updated[key] };
    }
  });

  return changes;
};