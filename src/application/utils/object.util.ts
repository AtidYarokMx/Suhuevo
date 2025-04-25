import { Types } from "@app/repositories/mongoose";

export function hasValidProperty(obj: Object | Types.ObjectId, property: string) {
  return typeof obj === "object" && obj != null && property in obj;
}
