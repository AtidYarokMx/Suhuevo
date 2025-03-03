/**
 * DTO para el Catálogo de Cajas
 */
import { ObjectId } from 'mongodb';

export interface ICatalogBox {
  _id?: ObjectId;
  id: string
  name: string;
  description?: string;
  count: number; // Cantidad de huevos por caja
  tare: number; // Peso tara de la caja
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdateBy?: string;
}
