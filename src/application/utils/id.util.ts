export function formatEmployeeId(id: string | number): string {
  if (typeof id === "string") return id.padStart(6, '0')
  return id.toString().padStart(6, '0')
}