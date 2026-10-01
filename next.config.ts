import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Used by the © notice in src/lib/seo.ts.
    BUILD_YEAR: String(new Date().getFullYear()),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.verve-marketing.space",
          },
        ],
        destination: "https://verve-marketing.space/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
