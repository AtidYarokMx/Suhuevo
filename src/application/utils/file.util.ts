import fs from 'node:fs'
import csvParser from 'csv-parser'

type CsvRow = Record<string, string>

export async function readCsv(file: Express.Multer.File) {
  const rows: { employeeId: string, checkInTime: string}[] = []
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(file.path).pipe(csvParser())
    stream.on("data", (row: CsvRow) => rows.push({ employeeId: row['Person ID'].replaceAll('\'', ''), checkInTime: row['Time'] }))
    stream.on("end", () => resolve())
    stream.on("error", (err) => reject(err))
  });
  return rows
}