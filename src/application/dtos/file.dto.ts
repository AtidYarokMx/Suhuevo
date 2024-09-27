import { Model, Types } from "@app/repositories/mongoose";

/* model types */
export type IAppFile = Omit<Express.Multer.File, "buffer" | "stream" | "fieldname" | "originalname" | "destination"> & {
  _id?: Types.ObjectId
  /* populated */
  idUser: Types.ObjectId
  /* defaults */
  updatedAt: Date
  createdAt: Date
}

export type IAppFileVirtuals = {
  fullpath: string
}

export type AppFile = Model<IAppFile, {}, {}, IAppFileVirtuals>

/* endpoint types */
export type UploadSingleResponse = {
  _id: Types.ObjectId
  filename: string
  mimetype: string
  fullpath: string
  size: number
}