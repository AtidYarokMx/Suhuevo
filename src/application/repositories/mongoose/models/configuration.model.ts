import mongoose from "mongoose";
import { AppMainMongooseRepo } from "..";

const ConfigurationSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // ID fijo: "weekAdmin"
  currentWeekStart: { type: Date, required: true },
  currentWeekEnd: { type: Date, required: true },
  lastUpdated: { type: Date, required: true }
}, { timestamps: true });

export const ConfigurationModel = AppMainMongooseRepo.model("Configuration", ConfigurationSchema);
