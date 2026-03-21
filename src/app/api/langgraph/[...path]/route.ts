import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.LANGGRAPH_DEPLOYMENT_URL;
const API_KEY = process.env.LANGGRAPH_API_KEY;

// Headers to selectively forward from client to backend
const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "x-request-id", "last-event-id"];

// Headers to selectively forward from backend to client
const FORWARD_RESPONSE_HEADERS = ["content-type", "x-request-id", "content-location"];

function notConfiguredResponse() {
  return new Response(JSON.stringify({ error: "LANGGRAPH_DEPLOYMENT_URL not configured" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function proxyRequest(request: NextRequest, { path }: { path: string[] }) {
  if (!BACKEND_URL) {
    return notConfiguredResponse();
  }

  const pathname = path.join("/");
  const url = new URL(pathname, BACKEND_URL);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Selectively forward request headers
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  // Inject API key server-side
  if (API_KEY) {
    headers.set("x-api-key", API_KEY);
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for non-GET/HEAD requests
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    // @ts-expect-error -- Node.js fetch requires duplex for streaming body
    fetchOptions.duplex = "half";
  }

  try {
    const backendResponse = await fetch(url.toString(), fetchOptions);

    // Build response headers
    const responseHeaders = new Headers();
    for (const key of FORWARD_RESPONSE_HEADERS) {
      const value = backendResponse.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }

    // Forward Location header for SSE reconnection, rewriting path to include proxy prefix
    const location = backendResponse.headers.get("location");
    if (location) {
      // Rewrite to route reconnection through the proxy
      responseHeaders.set("location", `/api/langgraph/${location.replace(/^\//, "")}`);
    }

    // Check if this is an SSE response
    const contentType = backendResponse.headers.get("content-type") || "";
    const isSSE = contentType.includes("text/event-stream");

    if (isSSE) {
      responseHeaders.set("Content-Type", "text/event-stream");
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      responseHeaders.set("Connection", "keep-alive");
      responseHeaders.set("X-Accel-Buffering", "no");
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unexpected proxy error";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}
