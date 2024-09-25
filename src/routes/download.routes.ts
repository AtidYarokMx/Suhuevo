/* lib */
import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* controller */
import { fileController } from '@controllers/file.controller'
import path from 'path'

class DownloadRoutes extends ServerRouter {
  controller = fileController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/:file', (req, res) => {
      res.download(path.join(__dirname, `../../docs/${req.params.file}`), (err) => {
        if (err) return res.status(400).json({ message: "Not found" })
      })
    })
  }
}

const downloadRoutes: DownloadRoutes = new DownloadRoutes()
export default downloadRoutes.router
