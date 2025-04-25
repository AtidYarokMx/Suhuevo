export function ifNotValueReturnZero(item: number | undefined | null): number {
  if (typeof item === "undefined") return 0;
  if (item == null) return 0;
  return item;
}
