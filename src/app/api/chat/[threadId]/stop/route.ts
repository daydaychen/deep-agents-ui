import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { sessionManager } from "@/lib/agent/session-manager";

export const runtime = "nodejs";

async function handler(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const stopped = sessionManager.stop(threadId);
  if (!stopped) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = withAuth(handler);
