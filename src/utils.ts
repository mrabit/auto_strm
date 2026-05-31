export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
