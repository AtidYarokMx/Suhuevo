import { Schema } from "mongoose";
import { AppMainMongooseRepo, SchemaTypes } from "../";
/* dtos */
import { IBoxCategory } from "@app/dtos/box-category.dto";

const BoxCategorySchema = new Schema<IBoxCategory>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true, unique: true }, // Nombre de la categoría
    description: { type: String }, // Descripción opcional
    primeCost: { type: Number, required: true }, // Costo prime de la categoría
    active: { type: Boolean, default: true },
    createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
    lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
    createdAt: { type: Date, default: () => Date.now(), immutable: true },
    updatedAt: { type: Date, default: () => Date.now() },
  },
  { timestamps: true }
);

export const BoxCategoryModel = AppMainMongooseRepo.model("box-category", BoxCategorySchema);
