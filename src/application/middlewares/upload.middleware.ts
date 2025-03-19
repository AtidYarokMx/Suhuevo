import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import path from "path";

const tempStorageDir = path.join(__dirname, "../../../uploads/temp");

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

export const uploadTempFileMiddleware = multer({ storage });
