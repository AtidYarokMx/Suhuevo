/* lib */
import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { uploadFileMiddleware } from '@app/middlewares/upload.middleware'
/* controller */
import { fileController } from '@controllers/file.controller'

class FileRoutes extends ServerRouter {
  controller = fileController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.post('/single', adminMiddleware, uploadFileMiddleware.single('file'), this.controller.uploadSingle as RequestHandler)
  }
}

const fileRoutes: FileRoutes = new FileRoutes()
export default fileRoutes.router
