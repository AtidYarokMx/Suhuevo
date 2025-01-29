export function padStart(value: string | number, maxLength: number, fillString: string) {
  return `${value}`.padStart(maxLength, fillString)
}