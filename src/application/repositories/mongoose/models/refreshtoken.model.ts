import { Schema, AppMainMongooseRepo } from "@app/repositories/mongoose";

export interface IRefreshToken extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true }, // ❌ Eliminamos `unique: true`
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// ✅ Permitir múltiples tokens por usuario sin errores de duplicación
RefreshTokenSchema.index({ userId: 1, token: 1 }, { unique: false });

// ✅ Opcional: índice adicional en `expiresAt` para limpieza eficiente
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = AppMainMongooseRepo.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
