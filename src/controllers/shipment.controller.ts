import type { Request, Response } from 'express';
import { AppMainMongooseRepo } from '@app/repositories/mongoose';
import { ShipmentService } from '@services/shipment.service';
import { appErrorResponseHandler } from '@app/handlers/response/error.handler';
import { ShipmentModel } from '@app/repositories/mongoose/schemas/shipment.schema';

class ShipmentController {

  public async sendBoxesToSells(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    const userId = (res.locals as any).user._id;
    const { codes, plates, driver } = req.body;

    try {
      if (!codes || !Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({ message: "Faltan los códigos (codes) o el formato es incorrecto." });
      }
      if (!plates || !driver) {
        return res.status(400).json({ message: "Placas (plates) o Conductor (driver) no proporcionados." });
      }

      if (!session.inTransaction()) session.startTransaction();

      const shipment = await ShipmentService.createShipment({ codes, plates, driver, userId }, session);
      await session.commitTransaction();

      return res.status(201).json(shipment);
    } catch (error) {
      await session.abortTransaction();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  public async getAllShipments(req: Request, res: Response): Promise<Response> {
    try {
      const shipments = await ShipmentService.getAllShipments();
      return res.status(200).json(shipments);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async getShipmentDetails(req: Request, res: Response): Promise<Response> {
    const { shipmentId } = req.params;

    try {
      const shipment = await ShipmentModel.findOne({ shipmentId });
      if (!shipment) return res.status(404).json({ message: 'Envío no encontrado.' });

      return res.status(200).json(shipment);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async updateShipment(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    const userId = (res.locals as any).user._id;
    const { shipmentId } = req.params;
    const { codes } = req.body;

    try {
      if (!codes || !Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({ message: "Códigos no proporcionados o formato incorrecto." });
      }

      if (!session.inTransaction()) session.startTransaction();

      const response = await ShipmentService.updateShipmentStatus({ shipmentId, codes, userId }, session);
      await session.commitTransaction();

      return res.status(200).json(response);
    } catch (error) {
      await session.abortTransaction();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }



}

export const shipmentController = new ShipmentController();
