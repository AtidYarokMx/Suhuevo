import fs from "fs-extra";
import path from "path";

const tempStorageDir = path.join(__dirname, "../../../uploads/temp");
const employeeStorageDir = path.join(__dirname, "../../../uploads/employees");

class FileService {
  async moveFiles(employeeId: string, tempFiles: string[]): Promise<string[]> {
    const employeeDir = path.join(employeeStorageDir, employeeId);
    await fs.ensureDir(employeeDir);

    const filePaths: string[] = [];
    for (const tempFileName of tempFiles) {
      const tempPath = path.join(tempStorageDir, tempFileName);
      const newPath = path.join(employeeDir, tempFileName);

      if (fs.existsSync(tempPath)) {
        await fs.rename(tempPath, newPath);
        filePaths.push(newPath);
      }
    }

    return filePaths;
  }

  async deleteTempFile(tempFileName: string): Promise<void> {
    const tempPath = path.join(tempStorageDir, tempFileName);
    if (fs.existsSync(tempPath)) {
      await fs.remove(tempPath);
    }
  }
}

const fileService = new FileService();
export default fileService;
