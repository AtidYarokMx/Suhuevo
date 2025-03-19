import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import path from "path";

const tempStorageDir = path.join(__dirname, "../../../uploads/temp");
const attendanceStorageDir = path.join(__dirname, "../../../uploads/attendance");

// Configurar almacenamiento en carpeta temporal
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(tempStorageDir);
    cb(null, tempStorageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

// ✅ Configurar almacenamiento para archivos de asistencia (CSV)
const attendanceStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(attendanceStorageDir);
    cb(null, attendanceStorageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `attendance_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

// ✅ Middleware para carga de archivos temporales (empleados)
export const uploadTempFileMiddleware = multer({ storage });

// ✅ Middleware para carga de archivos de asistencia (CSV)
export const uploadAttendanceFileMiddleware = multer({ storage: attendanceStorage });
