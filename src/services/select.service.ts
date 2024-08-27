import { type ISelect } from '@app/dtos/select.dto'
import { SelectModel } from '@app/repositories/mongoose/models/select.model'

class SelectService {
  async get (query: any): Promise<ISelect[]> {
    const end = Number(query?.end ?? 0)
    const start = Number(query?.start ?? 0)
    const limit = (end !== 0) ? end - start : 10

    const result = await SelectModel.find({ active: true }).skip(start).limit(limit)
    return result
  }
}

const selectService: SelectService = new SelectService()
export default selectService
