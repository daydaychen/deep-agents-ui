/**
 * Common error messages for async operations
 */
export const ErrorMessages = {
  LOAD_FAILED: "Failed to load",
  SAVE_FAILED: "Failed to save",
  DELETE_FAILED: "Failed to delete",
  UPDATE_FAILED: "Failed to update",
  FETCH_FAILED: "Failed to fetch",
  INITIALIZATION_FAILED: "Failed to initialize",
  CONNECTION_FAILED: "Connection failed",
} as const;

/**
 * Handle async operation errors with consistent logging
 * Returns the error message for further use (e.g., toast notifications)
 */
export function handleAsyncError(
  operation: string,
  error: unknown,
  context?: string
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextPrefix = context ? `${context}: ` : "";

  console.error(`${contextPrefix}${operation} failed:`, error);

  return `${operation} failed: ${errorMessage}`;
}

/**
 * Wrap an async function with error handling
 * Returns a tuple of [result, error] for easy error checking
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Wrap an async function with error handling and toast notification
 */
export async function tryCatchWithToast<T>(
  fn: () => Promise<T>,
  operationName: string,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const errorMessage = handleAsyncError(operationName, error);
    onError?.(new Error(errorMessage));
    return null;
  }
}