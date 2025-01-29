import { ConnectOptions } from "mongoose";

export const AppMongooseSettings: ConnectOptions = {
  appName: "ProavicolDev",
  retryWrites: true,
  w: "majority",
}
