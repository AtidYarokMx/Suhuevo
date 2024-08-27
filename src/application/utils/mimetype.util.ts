/* server models */
import { AppErrorResponse } from '@app/models/app.response'
/* constants */
import { validMimetypes } from '@app/constants/file.constants'

export function getImageAndPdfExtension (mimetype: string, name: string): string {
  if (!validMimetypes.includes(mimetype)) {
    throw new AppErrorResponse({ statusCode: 500, name: `Formato de archivo no válido - ${name}`, isOperational: true })
  }

  let extension = 'pdf'
  if (mimetype === 'image/png') extension = 'png'
  if (mimetype === 'image/jpeg') extension = 'jpg'

  return extension
}

export function getAudioMimetype (mimetype: string, name: string): string {
  console.log(mimetype)
  let extension = 'mp3'
  if (mimetype === 'audio/webm') extension = 'webm'
  if (mimetype === 'image/jpeg') extension = 'jpg'

  return extension
}
