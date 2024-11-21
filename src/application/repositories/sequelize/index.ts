import { Sequelize } from 'sequelize'
/* settings */
import { settings } from './settings'

export const AppSequelizeMSSQLClient = new Sequelize(settings)