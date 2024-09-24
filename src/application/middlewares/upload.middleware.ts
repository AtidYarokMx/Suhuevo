/* lib */
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
/* utils */
import { tempDocsDir } from '@app/constants/file.constants'
import { getFileExtension } from '@app/utils/file.util'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDocsDir ?? 'tmp/docs')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${uuidv4()}.${getFileExtension(file.mimetype)}`
    cb(null, uniqueSuffix)
  },
})

export const uploadFileMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // archivo no mayor a 5mb
})

function getFileName(fieldname: any): string {
  return fieldname.replaceAll('files', '').replaceAll('[', '').replaceAll(']', '') // .substring(fieldname.indexOf(']') + 2, fieldname.length - 1)
}
