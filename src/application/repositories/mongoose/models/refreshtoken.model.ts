import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'

export interface IRefreshToken extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
}

export const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const RefreshTokenModel = AppMainMongooseRepo.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
