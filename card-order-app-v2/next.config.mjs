import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // PDF 生成 (請求書/領収書) で使う日本語フォントを Vercel の関数バンドルへ
    // 確実に含める。これが無いと実行時に Font.register のファイルが見つからず失敗する。
    outputFileTracingIncludes: {
      "/api/invoices/[id]/pdf": ["./src/lib/pdf/fonts/**"],
      "/api/invoices/[id]/pdf/download": ["./src/lib/pdf/fonts/**"],
      "/api/invoices/[id]/receipt": ["./src/lib/pdf/fonts/**"],
      "/api/invoices/[id]/payment-notice/download": ["./src/lib/pdf/fonts/**"],
    },
  },
};

const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
