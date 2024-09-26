/* lib */
import { type ClientSession } from 'mongoose'
/* models */
import { CatalogPersonalBonusModel } from '@app/repositories/mongoose/models/catalog-personal-bonus.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import { ICreateCatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'


class CatalogService {
  async getPersonalBonus() {
    const catalog = await CatalogPersonalBonusModel.find({ active: true }).exec()
    return catalog
  }

  async createPersonalBonus(body: ICreateCatalogPersonalBonus[], session: ClientSession) {
    const catalog = new CatalogPersonalBonusModel({ ...body, active: true })
    const savedCatalog = await catalog.save({ session, validateBeforeSave: true })
    return savedCatalog
  }
}

const catalogService: CatalogService = new CatalogService()
export default catalogService
