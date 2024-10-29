export function prefixPadStart(prefix: string, maxLength: number, fillString?: string) {
  return `${prefix}`.padStart(maxLength, fillString)
}