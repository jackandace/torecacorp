'use client';
import {sitePath} from "../lib/site-path";

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {useDemoWallet} from './demo-wallet';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Menu,
  ArrowLeft,
  Trophy,
  Ticket,
  Zap,
  Sparkles,
  Gift,
  FlaskConical,
  History,
  UserRound,
  Plus,
  Bell,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export const nav = [
  ['/', 'オリパガチャ', Sparkles],
  ['/me/cards', '獲得商品', Gift],
  ['/lab', '合成ラボ', FlaskConical],
  ['/me/gacha_logs', 'ガチャ履歴', History],
  ['/me', 'マイページ', UserRound],
] as const;

function useActive() {
  const path = usePathname()?.replace(process.env.NEXT_PUBLIC_BASE_PATH || '__no_base__', '') || '/';
  return (href: string) =>
    href === '/'
      ? path === '/' ||
        path.startsWith('/box') ||
        path === '/choice-gacha' ||
        path === '/step-up'
      : href === '/me'
        ? path === '/me'
        : path.startsWith(href);
}
export function SiteHeader() {
  const wallet=useDemoWallet();
  const pathname = usePathname()?.replace(process.env.NEXT_PUBLIC_BASE_PATH || '__no_base__', '');
  const guest = ['/login', '/signup', '/password_reset'].includes(
    pathname || '',
  );
  return (
    <>
      <header className="site-header">
        <a href={sitePath("/oripa/All")} className="logo">
          <img src={sitePath("/assets/logo.svg")} alt="オリパレード" />
        </a>
        {guest ? (
          <div className="guest-actions">
            <a href={sitePath("/login")} className="button outline-button">
              ログイン
            </a>
            <a href={sitePath("/signup")} className="button primary-button">
              新規登録
            </a>
          </div>
        ) : (
          <>
            <a href={sitePath("/point")} className="wallet">
              <img src={sitePath("/assets/parade-coin.svg")} alt="" />
              <b>{wallet.balance.toLocaleString()}</b>
              <span className="wallet-plus">
                <Plus size={16} />
              </span>
            </a>
          </>
        )}
        <a className="header-utility" href={sitePath("/notification")} aria-label="お知らせ"><Bell size={23}/></a>
        <a className="account-menu-trigger" href={sitePath("/mypage")} aria-label="マイページ"><UserRound size={25}/></a>
      </header>
    </>
  );
}
export function CatalogNavigation({category}:{category:string}) {
  return <nav className="reference-category-nav" aria-label="オリパカテゴリ">{([['すべて','すべて','All'],['ポケモン','ポケモン','Pokemon'],['ワンピース','ワンピース','OnePiece']] as const).map(([c,label,slug])=><a key={c} href={sitePath('/oripa/'+slug)} aria-current={category===c?'page':undefined}>{label}</a>)}<a href={sitePath("/step-up?chainId=1")}>ステップアップ</a><a href={sitePath("/choice-gacha?groupId=1")}>2択ガチャ</a></nav>;
}
export function CatalogSidebar() {
  const path=usePathname()?.replace(process.env.NEXT_PUBLIC_BASE_PATH || '__no_base__', '');
  const groups=[['オリパ',[['/oripa/All','すべて'],['/oripa/Pokemon','ポケモン'],['/oripa/OnePiece','ワンピース'],['/step-up?chainId=1','ステップアップ'],['/choice-gacha?groupId=1','2択ガチャ']]],['獲得商品',[['/me/cards','獲得一覧'],['/me/gacha_logs','ガチャ履歴']]],['アカウント',[['/mypage','マイページ'],['/notification','お知らせ'],['/point','コイン購入'],['/purchases','コイン購入履歴'],['/mypage/address','お届け先の登録・変更']]],['特典・ヘルプ',[['/me/tickets','チケット'],['/coupon','クーポン'],['/login-bonus','ログインボーナス'],['/lab','合成ラボ'],['/others/help-oripa-rank','会員ランク'],['/help','ヘルプ']]]] as const;
  return <aside className="reference-sidebar" aria-label="サイドメニュー">{groups.map(([title,links])=><section key={title}><h2>{title}</h2>{links.map(([href,label])=><a key={href} href={sitePath(href)} aria-current={path===href?'page':undefined}>{label}</a>)}</section>)}</aside>;
}
export function SiteFooter() {
  const active = useActive();
  return (
    <>
      <footer>
        <a href={sitePath("/oripa/All")} className="logo">
          <img src={sitePath("/assets/logo.svg")} alt="オリパレード" />
        </a>
        <p>毎日が、お宝パレード。</p>
        <div>
          <a href={sitePath("/help")}>はじめての方へ</a>
          <a href={sitePath("/others/help-oripa-rank")}>会員ランク</a>
          <a href={sitePath("/help")}>よくある質問</a>
          <a href={sitePath("/design-system")}>画面・部品一覧</a>
        </div>
        <small>© ORI PARADE</small><p className="footer-preview-note">デザインプレビュー · 決済・抽選は実行されません</p>
      </footer>
      <nav className="mobile-nav">
        {nav.map(([href, label, Icon]) => (
          <a href={sitePath(href)} key={href} className={active(href) ? 'active' : ''}>
            <Icon size={22} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
export function PageHeading({
  title,
  kicker,
  description,
}: {
  title: string;
  kicker?: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      <a href={sitePath("/oripa/All")} className="page-back" aria-label="オリパ一覧へ戻る"><ArrowLeft size={20}/></a>
      <h1>{title}</h1>
    </div>
  );
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <Gift size={36} />
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <a className="button draw-button compact-button" href={sitePath(href)}>
          {label}
          <ArrowRight size={17} />
        </a>
      )}
    </div>
  );
}
export function Coin({ value }: { value: number }) {
  return (
    <span className="coin-value">
      <img src={sitePath("/assets/parade-coin.svg")} alt="" />
      <b>{value.toLocaleString('ja-JP')}</b>
      <small>コイン</small>
    </span>
  );
}
export function PreviewDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="parade-dialog">
        <span className="eyebrow">ORI PARADE</span>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description ||
            'デザインプレビューです。実際の取引・送信は行われません。'}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DrawSteps({ current }: { current: 1 | 2 | 3 }) {
 return <ol className="draw-journey" aria-label="ガチャの手順">{['オリパを選ぶ','内容・回数を確認','最終確認'].map((label,i)=><li key={label} className={i+1===current?'current':i+1<current?'done':''} aria-current={i+1===current?'step':undefined}><span>{i+1}</span>{label}{i<2&&<ChevronRight size={14}/>}</li>)}</ol>;
}
