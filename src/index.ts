import { AppServer } from './app'

export const appServer: AppServer = new AppServer()

// Solo iniciar servidores si no es entorno de test
if (process.env.NODE_ENV !== 'test') {
  appServer.start()
  appServer.crons()
}