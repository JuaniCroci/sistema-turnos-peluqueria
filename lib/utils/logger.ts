export const logError = (scope: string, err: unknown): void => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({ level: 'error', scope, message, stack }));
};
