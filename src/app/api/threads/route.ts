import { listSessions } from "@anthropic-ai/claude-agent-sdk";
import { withAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(_req: NextRequest) {
  try {
    const sessions = await listSessions({ limit: 100 });

    // Map SDKSessionInfo to a thread-like response
    const threads = sessions.map((session) => ({
      id: session.sessionId,
      title: session.customTitle || session.summary || `Session ${session.sessionId.slice(0, 8)}`,
      description: session.firstPrompt ?? "",
      updatedAt: new Date(session.lastModified).toISOString(),
      status: "idle" as const,
      messageCount: 0,
      gitBranch: session.gitBranch,
    }));

    return new Response(JSON.stringify(threads), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list sessions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withAuth(handler);
