/**
 * DTO para el Catálogo de Cajas
 */
import { ObjectId } from 'mongodb';

export interface ICatalogBox {
  _id?: ObjectId;
  id: string
  name: string;
  category: ObjectId;
  description?: string;
  count: number;
  tare: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdateBy?: string;
}
