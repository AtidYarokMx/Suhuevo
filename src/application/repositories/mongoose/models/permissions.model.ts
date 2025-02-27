import { Schema, model, Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  code: string; // Identificador único (ej: "USER_CREATE", "USER_DELETE")
}

const PermissionSchema = new Schema<IPermission>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
});

export const PermissionModel = model<IPermission>("Permission", PermissionSchema);
