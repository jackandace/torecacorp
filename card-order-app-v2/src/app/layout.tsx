import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "トレカ商事カンパニー 受発注システム",
  description: "PALETTE GROUP トレカ商事カンパニー 卸受発注・請求一元管理",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
