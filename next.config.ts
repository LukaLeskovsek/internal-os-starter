import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Invoice uploads (photos / PDFs) exceed the 1 MB Server Action default body limit.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  // Dev only: tool output folders (browser logs, reports) change every second;
  // watching them sends the dev server into an endless rebuild loop.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.gstack/**", "**/.next/**"],
      };
    }
    return config;
  },
};

// Sentry build-time options. Source-map upload only runs when SENTRY_AUTH_TOKEN
// is present (set automatically on Vercel after you connect Sentry); locally it
// is a no-op. org/project come from your Sentry account.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
