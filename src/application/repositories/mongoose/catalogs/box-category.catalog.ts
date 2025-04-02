import { Schema } from 'mongoose';
import { AppMainMongooseRepo } from '..';

const BoxCategorySchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true, unique: true },  // Nombre de la categoría
  description: { type: String },  // Descripción opcional
  primeCost: { type: Number, required: true }, // Costo prime de la categoría
  active: { type: Boolean, default: true }, // Estado de la categoría
  createdBy: { type: Schema.Types.ObjectId, ref: "users", required: true }, // Usuario que la creó
  lastUpdateBy: { type: Schema.Types.ObjectId, ref: "users", required: true } // Última modificación
}, { timestamps: true });

export const BoxCategoryModel = AppMainMongooseRepo.model("box-category", BoxCategorySchema);
