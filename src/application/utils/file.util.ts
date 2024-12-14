import mime from 'mime'
import fs from 'node:fs'
import csvParser from 'csv-parser'
/* dtos */
import { AttendanceCsvFields } from '@app/dtos/attendance.dto';

export async function readCsv(file: Express.Multer.File) {
  const rows: { employeeId: string, time: string }[] = []
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(file.path)
      .pipe(csvParser({ strict: true }))

    stream.on("data", (row: AttendanceCsvFields) => {
      rows.push({
        time: row['Time'],
        employeeId: row['Person ID'].replaceAll('\'', ''),
      })
    })
    stream.on("end", () => resolve())
    stream.on("error", (err) => reject(err))
  });
  return rows
}

export function getFileExtension(mimetype: string) {
  return mime.getExtension(mimetype)
}