import { query } from "@anthropic-ai/claude-agent-sdk";
import { NextRequest } from "next/server";
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
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { message, threadId, config } = parsed.data;

  // 2. Check concurrent session limit
  if (!sessionManager.canStart()) {
    return new Response(
      JSON.stringify({ error: "Too many concurrent sessions" }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
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

  // 5. Call SDK query
  const result = query({ prompt: message, options });

  // 6. Build SSE stream (pull-based ReadableStream)
  const encoder = new TextEncoder();
  let eventId = 0;
  const iterator = result[Symbol.asyncIterator]();

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
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
        if (abortController.signal.aborted) {
          controller.enqueue(encoder.encode("event: aborted\ndata: {}\n\n"));
        } else {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`
            )
          );
        }
        controller.close();
        sessionManager.unregister(effectiveThreadId);
      }
    },
    cancel() {
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
