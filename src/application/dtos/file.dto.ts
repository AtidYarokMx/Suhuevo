import { Model, Types } from "@app/repositories/mongoose";

/* model types */
export type TemporalFile = {
  /* populated */
  idUser: Types.ObjectId
  /* defaults */
  updatedAt: Date
  createdAt: Date
} & Omit<Express.Multer.File, "buffer" | "stream" | "fieldname" | "originalname" | "destination">

export type TemporalFileMethods = {
  fullpath(): string
}

export type AppTemporalFile = Model<TemporalFile, {}, TemporalFileMethods>

/* endpoint types */
export type UploadSingleResponse = {
  _id: Types.ObjectId
  filename: string
  mimetype: string
  fullpath: string
  size: number
}