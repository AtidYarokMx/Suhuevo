/* types */
import * as ExcelJS from "exceljs";
import type { Request, Response } from "express";
/* handlers */
import { appErrorResponseHandler } from "@app/handlers/response/error.handler";
/* services */
import summaryService from "@services/summary.service";
/* utils */
import { customLog } from "@app/utils/util.util";

/**
 * @swagger
 * tags:
 *   name: Summary
 *   description: Endpoints para el BSC
 */

class SummaryController {
  public async get(req: Request, res: Response): Promise<any> {
    try {
      customLog("[GET] /api/bsc");
      const response = await summaryService.get();
      return res.status(200).json(response);
    } catch (error) {
      customLog(`❌ [SummaryController.get] Error: ${error}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }
  public async generateExcel(req: Request, res: Response): Promise<any> {
    try {
      customLog("[POST] /api/bsc/excel");
      const workbook = new ExcelJS.Workbook();
      await summaryService.generateExcel(workbook);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="bsc.xlsx"');
      await workbook.xlsx.write(res);
      return res.status(200).end();
    } catch (error) {
      customLog(`❌ [SummaryController.get] Error: ${error}`);
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
    }
  }
}

export const summaryController: SummaryController = new SummaryController();
