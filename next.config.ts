import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Chromium per l'esportazione in PDF (src/lib/documents/export/pdf.ts): i binari compressi non
  // vengono tracciati da soli; solo le route che esportano o pubblicano.
  outputFileTracingIncludes: {
    "/api/documents/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/progetti/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    // Testi della Guida letti dal tool MCP read_guide.
    "/api/mcp": ["./src/content/guida/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
