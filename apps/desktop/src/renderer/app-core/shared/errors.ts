export function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function toError(error: unknown, message: string): Error {
  return error instanceof Error ? error : new Error(message);
}
