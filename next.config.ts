import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";
    const connectSrc = backendUrl
      ? `connect-src 'self' ${backendUrl} https://*.vercel-scripts.com https://vercel.live wss://ws-us3.pusher.com`
      : "connect-src 'self' https://*.vercel-scripts.com https://vercel.live wss://ws-us3.pusher.com";

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https://vercel.live",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://vercel.live 'unsafe-inline'",
              "img-src 'self' https://vercel.live https://vercel.com data: blob:",
              "font-src 'self' https://vercel.live https://assets.vercel.com data:",
              connectSrc,
              "frame-ancestors 'none'",
              "frame-src https://vercel.live",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
