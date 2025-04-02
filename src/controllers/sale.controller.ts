import type { Request, Response } from 'express';
import { AppMainMongooseRepo } from '@app/repositories/mongoose';
import { appErrorResponseHandler } from '@app/handlers/response/error.handler';
import { createSaleFromInventory, createSaleFromShipment, getAllSales, getOverdueSales, getSaleDetails, registerPayment } from '@services/sale.service';

class SaleController {
  public async createFromInventory(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    const userId = (res.locals as any).user._id;
    const dto = req.body;

    try {
      if (!dto.codes || !Array.isArray(dto.codes) || dto.codes.length === 0) {
        return res.status(400).json({ message: 'Lista de códigos (codes) no válida.' });
      }

      if (!dto.pricesByCategory || typeof dto.pricesByCategory !== 'object') {
        return res.status(400).json({ message: 'Debe proporcionar los precios por categoría.' });
      }

      if (!session.inTransaction()) session.startTransaction();

      const sale = await createSaleFromInventory(dto, { _id: userId });

      await session.commitTransaction();
      return res.status(201).json(sale);
    } catch (error) {
      await session.abortTransaction();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  public async createFromShipment(req: Request, res: Response): Promise<Response> {
    const session = await AppMainMongooseRepo.startSession();
    const userId = (res.locals as any).user._id;
    const dto = req.body;

    try {
      if (!dto.codes || !Array.isArray(dto.codes) || dto.codes.length === 0) {
        return res.status(400).json({ message: 'Lista de códigos (codes) no válida.' });
      }

      if (!dto.pricesByCategory || typeof dto.pricesByCategory !== 'object') {
        return res.status(400).json({ message: 'Debe proporcionar los precios por categoría.' });
      }

      if (!session.inTransaction()) session.startTransaction();

      const sale = await createSaleFromShipment(dto, { _id: userId });

      await session.commitTransaction();
      return res.status(201).json(sale);
    } catch (error) {
      await session.abortTransaction();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    } finally {
      await session.endSession();
    }
  }

  public async getAllSales(req: Request, res: Response): Promise<Response> {
    try {
      const filters = {
        clientId: req.query.clientId as string,
        status: req.query.status as 'pendiente' | 'pagado' | 'cancelado',
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        folio: req.query.folio as string,
        paymentType: req.query.paymentType as 'credito' | 'contado',
      };

      const sales = await getAllSales(filters);
      return res.status(200).json(sales);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async getSaleDetails(req: Request, res: Response): Promise<Response> {
    const { saleId } = req.params;
    try {
      const sale = await getSaleDetails(saleId);
      return res.status(200).json(sale);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async registerPayment(req: Request, res: Response): Promise<Response> {
    const { saleId } = req.params;
    const userId = (res.locals as any).user._id;
    const dto = req.body;

    try {
      const sale = await registerPayment(saleId, dto, { _id: userId });
      return res.status(200).json(sale);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async getOverdueSales(req: Request, res: Response): Promise<Response> {
    try {
      const sales = await getOverdueSales();
      return res.status(200).json(sales);
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

}

export const saleController = new SaleController();
