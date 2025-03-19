import { Request, Response } from "express";
import fileService from "@services/file.service";

class FileController {
  async uploadTempFile(req: Request, res: Response): Promise<any> {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    return res.json({ tempFileName: req.file.filename });
  }

  async moveFilesToEmployee(req: Request, res: Response): Promise<any> {
    const { employeeId, tempFiles } = req.body;
    if (!employeeId || !tempFiles || !Array.isArray(tempFiles)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    try {
      const filePaths = await fileService.moveFiles(employeeId, tempFiles);
      return res.json({ message: "Files moved successfully", filePaths });
    } catch (error) {
      return res.status(500).json({ message: "Error moving files", error });
    }
  }

  async deleteTempFile(req: Request, res: Response): Promise<any> {
    const { tempFileName } = req.body;
    if (!tempFileName) return res.status(400).json({ message: "Invalid file name" });

    try {
      await fileService.deleteTempFile(tempFileName);
      return res.json({ message: "File deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error deleting file", error });
    }
  }
}

const fileController = new FileController();
export { fileController };
