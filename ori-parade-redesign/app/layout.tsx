import type { Metadata } from 'next';
import './globals.css';
import './reference-layout.css';
import './candy-theme.css';
import {DemoWalletProvider} from './demo-wallet';
export const metadata: Metadata = {
  title: 'オリパレード｜毎日が、お宝パレード。',
  description: 'オリパレード PC・スマートフォン デザインプレビュー',
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body><DemoWalletProvider>{children}</DemoWalletProvider></body>
    </html>
  );
}
