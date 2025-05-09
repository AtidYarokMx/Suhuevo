/* types */
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
}

export const summaryController: SummaryController = new SummaryController();
