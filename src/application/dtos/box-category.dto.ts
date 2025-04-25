import { Types } from "@app/repositories/mongoose";
import { ICommonFields } from "./common.dto";

export type IBoxCategory = {
  _id: Types.ObjectId;
  name: string;
  description: string;
  primeCost: number;
} & ICommonFields;
