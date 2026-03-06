/**
 * Buffer-based SSE parser that handles TCP chunk boundaries correctly.
 * Returns typed SSE events from a raw byte/string stream.
 */

export interface SSEEvent {
  event?: string;
  id?: string;
  data: string;
}

/**
 * Parse a ReadableStream<Uint8Array> of SSE data into an async iterable of SSEEvent.
 * Handles multi-line data fields, empty lines, comments, and chunk boundaries.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const parts = buffer.split("\n\n");
    // Last part may be incomplete — keep it in the buffer
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = parseSSEBlock(part);
      if (event) {
        yield event;
      }
    }
  }

  // Flush any remaining data
  if (buffer.trim()) {
    const event = parseSSEBlock(buffer);
    if (event) {
      yield event;
    }
  }
}

/**
 * Parse a single SSE block (lines between double newlines) into an SSEEvent.
 */
function parseSSEBlock(block: string): SSEEvent | null {
  let eventType: string | undefined;
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    // Skip comments
    if (line.startsWith(":")) continue;

    // Empty line — should not appear within a block, but be safe
    if (line === "") continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      // Field with no value — treat as field name with empty value
      continue;
    }

    const field = line.slice(0, colonIdx);
    // Per SSE spec, if first char after colon is a space, skip it
    let value = line.slice(colonIdx + 1);
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    switch (field) {
      case "event":
        eventType = value;
        break;
      case "id":
        id = value;
        break;
      case "data":
        dataLines.push(value);
        break;
      // "retry" and other fields are ignored
    }
  }

  // No data lines means no event
  if (dataLines.length === 0) return null;

  return {
    event: eventType,
    id,
    data: dataLines.join("\n"),
  };
}
