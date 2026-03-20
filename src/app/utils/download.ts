/**
 * Sanitize a filename to only allow safe characters.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-.]/g, "_").substring(0, 100) || "export";
}

/**
 * Download a string or Blob as a file.
 */
export function downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType ?? "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download a file from a URL (data: URI or https:).
 */
export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  a.click();
}
