'use client';
import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { SiteHeader, SiteFooter, CatalogNavigation, CatalogSidebar } from './shared';
import {GachaSummary} from './gacha-summary';
import {GachaPlay} from './gacha-play';
import {CatalogBadges} from './catalog-badges';
import {
  Sparkles,
  Gift,
  FlaskConical,
  History,
  UserRound,
  ChevronRight,
  Plus,
  Bell,
  Ticket,
  CircleHelp,
  ArrowUpRight,
  PartyPopper,
  Zap,
  ArrowRight,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
const nav = [
  ['/', 'オリパガチャ', Sparkles],
  ['/me/cards', '獲得商品', Gift],
  ['/lab', '合成ラボ', FlaskConical],
  ['/me/gacha_logs', 'ガチャ履歴', History],
  ['/me', 'マイページ', UserRound],
] as const;
export default function Parade({ initialCategory = 'すべて' }: { initialCategory?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('おすすめ順');
  useEffect(() => {
    type ModelContext = {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'filter_oripa_catalog',
            title: 'オリパ一覧を絞り込む',
            description:
              'デザインプレビューのオリパ一覧をカテゴリーで絞り込みます。抽選や購入は行いません。',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['すべて', 'ポケモン', 'ワンピース'],
                },
              },
              required: ['category'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: (input) => {
              if (
                !input ||
                typeof input !== 'object' ||
                !('category' in input) ||
                !['すべて', 'ポケモン', 'ワンピース'].includes(
                  String(input.category),
                ) ||
                Object.keys(input).some((k) => k !== 'category')
              )
                throw new Error('有効なカテゴリーを指定してください。');
              const c = String(input.category);
              flushSync(() => { setCategory(c); });
              return { category: c, visibleCount: c === 'ワンピース' ? 0 : 3 };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);

  const order = [0, 1, 2].sort((a, b) =>
    sort === 'コインが低い順'
      ? (a === 2 ? 100 : 555) - (b === 2 ? 100 : 555)
      : sort === 'コインが高い順'
        ? (b === 2 ? 100 : 555) - (a === 2 ? 100 : 555)
        : sort === '残ゲージが長い順'
          ? [64698 / 65000, 63591 / 65001, 318599 / 319000][b] -
            [64698 / 65000, 63591 / 65001, 318599 / 319000][a]
          : sort === '残ゲージが短い順'
            ? [64698 / 65000, 63591 / 65001, 318599 / 319000][a] -
              [64698 / 65000, 63591 / 65001, 318599 / 319000][b]
            : a - b,
  );
  const visible = category === 'ワンピース' ? [] : order;
  return (
    <div className="catalog-shell">
      <CatalogSidebar/>
      <div className="catalog-surface">
      <SiteHeader />
      <CatalogNavigation category={category}/>
      <main className="page-container catalog-page">
        <section id="gachas" className="section">
          <div className="catalog-controls">
            <div className="catalog-title"><h1>オリパ一覧</h1><span>{visible.length}件</span></div>
            <Select value={sort} onValueChange={(v) => setSort(String(v))}>
              <SelectTrigger
                className="catalog-sort"
                aria-label="オリパの並び順"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'おすすめ順',
                  'コインが高い順',
                  'コインが低い順',
                  '残ゲージが長い順',
                  '残ゲージが短い順',
                ].map((v) => (
                  <SelectItem value={v} key={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gacha-grid">
            {visible.map((n) => (
              <article className="gacha-card" key={n}>
                <CatalogBadges category="ポケモン" hashtags={[]} dailyLimit={n===2?undefined:n===1?200000:100000}/>
                <a
                  href={'/oripa/Pokemon/' + (n === 2 ? 13 : n === 1 ? 21 : 22)}
                  className="gacha-cover"
                >
                  <img
                    src={
                      '/assets/' +
                      (n === 2 ? 'gacha-pink.jpeg' : 'monster.jpeg')
                    }
                    alt={n === 2 ? 'ポケモン オリパ' : 'モンスターパレード'}
                  />

                </a>
                <div className="gacha-content">
                  <GachaSummary cost={n===2?100:555} left={n===2?318599:n===1?63591:64698} total={n===2?319000:n===1?65001:65000}/>
                  <Progress
                    value={
                      n === 2
                        ? (318599 / 319000) * 100
                        : n === 1
                          ? (63591 / 65001) * 100
                          : (64698 / 65000) * 100
                    }
                    aria-label="残り口数の割合"
                  />
                  <GachaPlay boxId={n===2?13:n===1?21:22} cost={n===2?100:555} name={n===2?'ポケモン お楽しみオリパ':'モンスターパレード'}/>
                  <a className="lineup-link" href={'/oripa/Pokemon/'+(n===2?13:n===1?21:22)}>景品ラインナップを見る</a>
                </div>
              </article>
            ))}
          </div>
          {category === 'ワンピース' && (
            <div className="empty-state">
              <Gift size={36} />
              <h3>ただいま準備中です</h3>
              <p>公開中のオリパは「すべて」からご覧ください。</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
