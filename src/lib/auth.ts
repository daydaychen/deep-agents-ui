import { NextRequest, NextResponse } from "next/server";

/**
 * Bearer token authentication middleware for API routes.
 * Validates Authorization header against API_SECRET_KEY env var.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: any) => Promise<Response>
): (req: NextRequest, ctx: any) => Promise<Response> {
  return async (req, ctx) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    if (token !== process.env.API_SECRET_KEY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}
