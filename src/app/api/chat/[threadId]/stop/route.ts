import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { sessionManager } from "@/lib/agent/session-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  if (!UUID_RE.test(threadId)) {
    return NextResponse.json({ error: "Invalid threadId format" }, { status: 400 });
  }
  const stopped = sessionManager.stop(threadId);
  if (!stopped) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = withAuth(handler);
