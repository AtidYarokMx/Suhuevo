import { type Options } from "sequelize";

export const settings: Options = {
  dialect: 'mssql',
  database: process.env.SEQUELIZE_DATABASE,
  username: process.env.SEQUELIZE_USERNAME,
  password: process.env.SEQUELIZE_PASSWORD,
  host: process.env.SEQUELIZE_HOST,
}