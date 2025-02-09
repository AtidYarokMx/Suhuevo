import type { Request, Response } from "express";
import moment from "moment";
import { appErrorResponseHandler } from "@app/handlers/response/error.handler";
import { AppMainMongooseRepo } from "@app/repositories/mongoose";
import attendanceService from "../services/attendance.service";

class AttendanceController {
  public async get(req: Request, res: Response): Promise<any> {
    const query = req.query;
    try {
      const response = await attendanceService.get(query);
      return res.status(200).json(response);
    } catch (error: unknown) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async create(req: Request, res: Response): Promise<any> {
    const body: any = req.body;
    try {
      const response = await attendanceService.create(body);
      return res.status(200).json(response);
    } catch (error: unknown) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async update(req: Request, res: Response): Promise<any> {
    const body: any = req.body;
    try {
      const response = await attendanceService.update(body);
      return res.status(200).json(response);
    } catch (error: unknown) {
      console.error(error);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query;
    try {
      const response = await attendanceService.search(query);
      return res.status(200).json(response);
    } catch (error: unknown) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async importFromCsv(req: Request, res: Response): Promise<any> {
    const file = req.file;
    try {
      const response = await attendanceService.importFromCsv(file);
      return res.status(200).json(response);
    } catch (error: unknown) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }

  public async generateAutomaticDailyAttendances(req: Request, res: Response): Promise<any> {
    const body: any = req.body;
    const session = await AppMainMongooseRepo.startSession();
    try {
      session.startTransaction();
      const response = await attendanceService.generateAutomaticDailyAttendances(body, session);
      await session.commitTransaction();
      await session.endSession();
      return res.status(200).json(response);
    } catch (error: unknown) {
      await session.abortTransaction();
      await session.endSession();
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }
}

export const attendanceController: AttendanceController = new AttendanceController();
