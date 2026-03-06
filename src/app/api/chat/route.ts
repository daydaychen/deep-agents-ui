import { query } from "@anthropic-ai/claude-agent-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAgentOptions } from "@/lib/agent/config";
import { chatRequestSchema } from "@/lib/validation";
import { withAuth } from "@/lib/auth";
import { sessionManager } from "@/lib/agent/session-manager";

// Must use Node.js runtime (query() spawns child processes)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5-minute timeout

async function handler(req: NextRequest) {
  // 1. Parse and validate input
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
  }
  const { message, threadId, config } = parsed.data;

  // 2. Check concurrent session limit
  if (!sessionManager.canStart()) {
    return NextResponse.json({ error: "Too many concurrent sessions" }, { status: 429 });
  }

  // 3. Build SDK options
  const abortController = new AbortController();
  const effectiveThreadId = threadId ?? crypto.randomUUID();

  const options = getAgentOptions({
    // sessionId and resume are mutually exclusive per SDK docs
    ...(threadId
      ? { resume: threadId }
      : { sessionId: effectiveThreadId }),
    ...(config?.maxTurns ? { maxTurns: config.maxTurns } : {}),
    ...(config?.model ? { model: config.model } : {}),
    abortController,
  });

  // 4. Register session
  sessionManager.register(effectiveThreadId, abortController);

  // 5. Call SDK query (wrapped in try/catch to clean up session on failure)
  let result: ReturnType<typeof query>;
  try {
    result = query({ prompt: message, options });
  } catch (error) {
    console.error("[chat] Failed to start query:", error);
    sessionManager.unregister(effectiveThreadId);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }

  // 6. Build SSE stream (pull-based ReadableStream)
  const encoder = new TextEncoder();
  let eventId = 0;
  const iterator = result[Symbol.asyncIterator]();

  // Heartbeat: SSE comment to keep the connection alive during long thinking
  const HEARTBEAT_INTERVAL_MS = 15_000;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function clearHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      // Emit threadId as the very first SSE event
      controller.enqueue(
        encoder.encode(`event: thread_id\ndata: ${JSON.stringify({ threadId: effectiveThreadId })}\n\n`)
      );
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream already closed — clean up silently
          clearHeartbeat();
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
          clearHeartbeat();
          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
          controller.close();
          sessionManager.unregister(effectiveThreadId);
          return;
        }

        const eventType = value.type ?? "message";
        controller.enqueue(
          encoder.encode(
            `event: ${eventType}\nid: ${++eventId}\ndata: ${JSON.stringify(value)}\n\n`
          )
        );
      } catch (error) {
        clearHeartbeat();
        if (abortController.signal.aborted) {
          controller.enqueue(encoder.encode("event: aborted\ndata: {}\n\n"));
        } else {
          console.error("[chat] SSE stream error:", error);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "An internal error occurred" })}\n\n`
            )
          );
        }
        controller.close();
        sessionManager.unregister(effectiveThreadId);
      }
    },
    cancel() {
      clearHeartbeat();
      abortController.abort();
      sessionManager.unregister(effectiveThreadId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Thread-Id": effectiveThreadId,
    },
  });
}

export const POST = withAuth(handler);
