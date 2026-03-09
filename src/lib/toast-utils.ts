import { toast } from "sonner";

/**
 * Options for error toast display
 */
interface ErrorToastOptions {
  /** Unique ID to prevent duplicate toasts */
  id?: string;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Display an error toast notification
 * Handles common error formatting patterns across the codebase
 */
export function showErrorToast(
  message: string,
  error?: unknown,
  options?: ErrorToastOptions
): void {
  const errorMessage = error ? `${message}: ${String(error)}` : message;
  const toastId = options?.id || `toast-${errorMessage.substring(0, 50)}`;

  toast.error(errorMessage, {
    id: toastId,
    duration: options?.duration,
  });
}

/**
 * Display a success toast notification
 */
export function showSuccessToast(message: string, options?: ErrorToastOptions): void {
  toast.success(message, {
    id: options?.id,
    duration: options?.duration,
  });
}