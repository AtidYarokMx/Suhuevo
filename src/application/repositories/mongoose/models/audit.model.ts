import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose';

export interface IAuditLog extends Document {
  userId: string;
  collectionName: string;
  documentId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  responseTime?: number;
  timestamp: Date;
}

const AuditSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true }, // 🔹 Usuario responsable
    collectionName: { type: String, required: true },
    documentId: { type: String, required: true },
    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String }, // 🔍 IP del usuario
    userAgent: { type: String }, // 🔍 User-Agent del navegador/dispositivo
    responseTime: { type: Number }, // ⏳ Tiempo de ejecución de la petición
    timestamp: { type: Date, default: Date.now },
  }
);

export const AuditLog = AppMainMongooseRepo.model<IAuditLog>("AuditLog", AuditSchema);
