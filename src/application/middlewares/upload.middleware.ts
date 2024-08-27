import multer from 'multer'
/* utils */
import { getAudioMimetype } from '@app/utils/mimetype.util'
import { tempDocsDir } from '@app/constants/file.constants'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDocsDir ?? 'tmp/docs')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${file.originalname}`
    cb(null, uniqueSuffix)
  }
})

export const uploadFileMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // archivo no mayor a 5mb
})

function getFileName (fieldname: any): string {
  return fieldname.replaceAll('files', '').replaceAll('[', '').replaceAll(']', '') // .substring(fieldname.indexOf(']') + 2, fieldname.length - 1)
}
