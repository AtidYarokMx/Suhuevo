import { Model, Types } from "@app/repositories/mongoose";

/* model types */
export type IAppFile = {
  _id?: Types.ObjectId
  /* populated */
  idUser: Types.ObjectId
  /* defaults */
  updatedAt: Date
  createdAt: Date
} & Omit<Express.Multer.File, "buffer" | "stream" | "fieldname" | "originalname" | "destination">

export type IAppFileVirtuals = {
  fullpath: string
}

export type AppFile = Model<IAppFile, Record<string, unknown>, Record<string, unknown>, IAppFileVirtuals>

/* endpoint types */
export type UploadSingleResponse = {
  _id: Types.ObjectId
  filename: string
  mimetype: string
  fullpath: string
  size: number
}