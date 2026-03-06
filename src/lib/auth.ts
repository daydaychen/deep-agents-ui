import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Timing-safe comparison of two secret strings.
 * Returns true if the strings are equal, false otherwise.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Bearer token authentication middleware for API routes.
 * Validates Authorization header against API_SECRET_KEY env var.
 *
 * - In production: API_SECRET_KEY must be set or the request is rejected with 500.
 * - In development: if API_SECRET_KEY is not set, auth is bypassed with a warning.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: Record<string, unknown>) => Promise<Response>
): (req: NextRequest, ctx: Record<string, unknown>) => Promise<Response> {
  return async (req, ctx) => {
    const secret = process.env.API_SECRET_KEY;
    const isProduction = process.env.NODE_ENV === "production";

    if (!secret) {
      if (isProduction) {
        console.error(
          "[AUTH] FATAL: API_SECRET_KEY is not set. Refusing to serve requests in production without authentication."
        );
        return NextResponse.json(
          { error: "Server misconfiguration: authentication is not configured" },
          { status: 500 }
        );
      }
      // Development mode: allow bypass but warn loudly
      console.warn(
        "[AUTH] WARNING: API_SECRET_KEY is not set. Authentication is disabled. Do NOT deploy like this."
      );
      return handler(req, ctx);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    if (!timingSafeCompare(token, secret)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, ctx);
  };
}
