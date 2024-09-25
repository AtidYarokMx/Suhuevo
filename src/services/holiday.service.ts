/* lib */
import { type Types } from '@app/repositories/mongoose'
import { type FlattenMaps, type ClientSession } from 'mongoose'
/* models */
import { HolidayModel } from '@app/repositories/mongoose/models/holiday.model'
/* model response */
import { AppErrorResponse } from '@app/models/app.response'
/* dtos */
import { ICreateBody, IHoliday } from '@app/dtos/holiday.dto'
import { AppLocals } from '@app/interfaces/auth.dto'


class HolidayService {
  async create(body: ICreateBody, locals: AppLocals, session: ClientSession): Promise<FlattenMaps<IHoliday & { _id: Types.ObjectId }>> {
    // ...
    console.log(body)
    const holiday = new HolidayModel({ ...body })
    const savedHoliday = await holiday.save({ session })
    return savedHoliday.toJSON()
  }
}

const holidayService: HolidayService = new HolidayService()
export default holidayService
