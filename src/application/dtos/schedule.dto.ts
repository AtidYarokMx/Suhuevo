export interface ISchedule {
  id: string

  name: string
  events: IScheduleEvent[]

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export interface IScheduleEvent {
  id: string
  title: string
  start: string
  end: string
}

