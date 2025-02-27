import { Schema, model, Document } from "mongoose"

export interface IRole extends Document {
  name: string
  permissions: Schema.Types.ObjectId[]
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, unique: true, required: true },
  permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
}, { timestamps: true })

export const Role = model<IRole>("Role", RoleSchema)