import { Request, Response } from "express";
import fileService from "@services/file.service";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import employeeService from "@services/employee.service";

class FileController {
  /**
   * Sube un archivo temporal y devuelve su nombre de archivo generado.
   */
  async uploadTempFile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      return res.status(200).json({ tempFileName: req.file.filename });
    } catch (error) {
      console.error("Error uploading temp file:", error);
      return res.status(500).json({ message: "Error uploading file", error });
    }
  }

  /**
   * Mueve archivos de la carpeta temporal a la carpeta de empleados al registrar un nuevo empleado
   */
  async moveFilesToEmployee(req: Request, res: Response): Promise<Response> {
    const { employeeId, tempFiles } = req.body;

    try {
      const filePaths = await employeeService.moveAndSaveFiles(employeeId, tempFiles);
      return res.status(200).json({ message: "Files moved successfully", filePaths });
    } catch (error) {
      return res.status(500).json({ message: "Error moving files", error });
    }
  }

  /**
   * Elimina un archivo temporal.
   */
  async deleteTempFile(req: Request, res: Response): Promise<Response> {
    const { tempFileName } = req.body;

    if (!tempFileName || typeof tempFileName !== "string") {
      return res.status(400).json({ message: "Invalid file name" });
    }

    try {
      await fileService.deleteTempFile(tempFileName);
      return res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(500).json({ message: "Error deleting file", error });
    }
  }
}

const fileController = new FileController();
export { fileController };
