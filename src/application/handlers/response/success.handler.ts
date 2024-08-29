import { AppResponse } from '@app/models/app.response'

export function appSuccessResponseHandler<T> (message: string, data: T): AppResponse<T> {
  const result = new AppResponse<T>()
  result.message = message
  result.response = data

  return result
}

export function appEndResponseHandler <T> (message: string, data?: T): AppResponse<T> {
  const result = new AppResponse<T>()
  result.message = message
  if (data !== undefined) result.response = data

  return result
}
