export interface AppErrorArgs {
  code?: string
  name: string
  statusCode: number
  description?: string
  isOperational?: boolean
  message?: string
}
