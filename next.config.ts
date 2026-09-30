import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
