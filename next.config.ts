import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Accel-Buffering",
            value: "no",
          },
        ],
      },
    ];
  },
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

export default withNextIntl(nextConfig)
