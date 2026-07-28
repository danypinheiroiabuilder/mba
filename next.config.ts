import path from "node:path";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
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
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Produção: sem unsafe-eval; dev: com unsafe-inline/unsafe-eval para HMR
      isProduction
        ? "script-src 'self' 'nonce-placeholder'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Supabase API + Realtime
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      // Produção: sem unsafe-inline em style-src; dev: com unsafe-inline para HMR
      isProduction
        ? "style-src 'self' https://fonts.googleapis.com"
        : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
