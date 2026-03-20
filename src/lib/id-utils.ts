import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique ID using UUID v4
 * Wrapper around uuid library for consistent ID generation across the codebase
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generate a short unique ID (first 8 characters of UUID)
 * Useful for cases where a shorter ID is sufficient
 */
export function generateShortId(): string {
  return uuidv4().substring(0, 8);
}

/**
 * Generate a timestamp-based ID
 * Useful for cases where chronological ordering is helpful
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
