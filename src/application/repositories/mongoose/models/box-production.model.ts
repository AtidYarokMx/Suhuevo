/**
 * Modelo de Órdenes
 */

/* lib */
import { Schema, AppMainMongooseRepo } from "@app/repositories/mongoose";
/* types */
import { IBoxProduction } from "@app/dtos/box-production.dto";

/*
El catalogo de status va a quedar como:
1 - Inv de Empaque
2.- Enviado
3.- Transito
4.- Recibido / Inv Ventas
5.- Vendido
6 .- Devuelto
99.- Erroneo
98.- Merma
*/

export const BoxProductionSchema = new Schema<IBoxProduction>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    farmNumber: { type: Number, required: true },
    shedNumber: { type: Number, required: true },
    farm: { type: Schema.Types.ObjectId, ref: "farm" },
    shed: { type: Schema.Types.ObjectId, ref: "shed" },
    code: { type: String, required: true, unique: true },
    grossWeight: { type: Number, required: true },
    netWeight: { type: Number, required: true },
    avgEggWeight: { type: Number, required: true },
    status: { type: Number, required: true },
    type: { type: Schema.Types.ObjectId, ref: "catalog-box", required: true },
    totalEggs: { type: Number, required: true, default: 0 },
    /* defaults */
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => Date.now(), immutable: true },
    updatedAt: { type: Date, default: () => Date.now() },
  },
  { collection: "box-production" }
);

/* pre (middlewares) */
BoxProductionSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

/* model instance */
export const BoxProductionModel = AppMainMongooseRepo.model<IBoxProduction>("box-production", BoxProductionSchema);
