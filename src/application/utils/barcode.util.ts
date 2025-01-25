import { z } from 'zod'
import { formatParse } from '@app/utils/date.util'

const barcodeSchema = z.string().trim().length(21)

export function extractDataFromBarcode(barcode: string) {
  const validatedBarcode = barcodeSchema.parse(barcode)

  /* fecha y hora */
  const year = validatedBarcode.substring(0, 2)
  const month = validatedBarcode.substring(2, 4)
  const day = validatedBarcode.substring(4, 6)
  const hour = validatedBarcode.substring(6, 8)
  const minutes = validatedBarcode.substring(8, 10)
  const seconds = validatedBarcode.substring(10, 12)

  const dateTime = formatParse(`${year}-${month}-${day} ${hour}:${minutes}:${seconds}`, "YYY-MM-DD HH:mm:ss")

  /* weight */
  const weight = parseInt(validatedBarcode.substring(12, 16), 10)
  const farmId = parseInt(validatedBarcode.substring(16, 18), 10)
  const type = parseInt(validatedBarcode.substring(18, 20), 10)
  const extraInfo = validatedBarcode.substring(20)

  return {
    type,
    weight,
    farmId,
    dateTime,
    extraInfo
  }
}