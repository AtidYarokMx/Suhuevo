import express from "express";
import { authenticateUser } from "@app/middlewares/auth.middleware";
import { uploadTempFileMiddleware } from "@app/middlewares/upload.middleware";
import { fileController } from "@controllers/file.controller";

const router = express.Router();

// ✅ Ruta para subir archivos temporalmente
router.post("/single", authenticateUser, uploadTempFileMiddleware.single("file"), fileController.uploadTempFile);

// ✅ Ruta para subir archivos temporalmente
router.post("/upload-temp", authenticateUser, uploadTempFileMiddleware.single("file"), fileController.uploadTempFile);

// ✅ Ruta para mover archivos a la carpeta del empleado
router.post("/move-files", authenticateUser, fileController.moveFilesToEmployee);

// ✅ Ruta para eliminar archivos temporales
router.post("/delete-temp", authenticateUser, fileController.deleteTempFile);

export default router;
