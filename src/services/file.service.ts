/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { TemporalFileModel } from '@app/repositories/mongoose/models/file.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import { UploadSingleResponse } from '@app/dtos/file.dto'
import { AppLocals } from '@app/interfaces/auth.dto'


class FileService {
  async uploadSingle(file: Express.Multer.File | undefined, locals: AppLocals, session: ClientSession): Promise<UploadSingleResponse> {
    if (typeof file === "undefined") throw new AppErrorResponse({ statusCode: 500, name: "No se mandó un archivo desde el lado del cliente" })

    const temporalFile = new TemporalFileModel({
      idUser: locals.user._id,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: "/tmp/docs/"
    })

    const savedFile = await temporalFile.save({ session })

    return {
      ...savedFile.toJSON(),
      fullpath: savedFile.fullpath()
    }
  }
}

const fileService: FileService = new FileService()
export default fileService
