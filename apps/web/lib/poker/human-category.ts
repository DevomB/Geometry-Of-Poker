/** Human-readable label for poker-calculations hand category strings. */
export function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
