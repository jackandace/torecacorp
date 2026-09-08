'use client';
import {GachaSummary} from './gacha-summary';
import { useState, useEffect, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ChevronRight,
  Check,
  Gift,
  Sparkles,
  Ticket,
  FlaskConical,
  Plus,
  UserRound,
  Trophy,
  Zap,
  MapPin,
  Mail,
  LockKeyhole,
  Copy,
  LogOut,
  Clock3,
  Truck,
  CircleHelp,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Bell,
  Package,
  Heart,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DrawSteps,
  SiteHeader,
  SiteFooter,
  PageHeading,
  Empty,
  Coin,
  PreviewDialog,
} from './shared';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supportedRoutes } from './routes';
import {GachaPlay} from './gacha-play';
import {useDemoWallet} from './demo-wallet';
import {PrizeLineup,GachaNotes} from './lineup';
const products = [
  {
    id: 22,
    name: 'モンスターパレード',
    image: 'monster.jpeg',
    cost: 555,
    left: 64698,
    total: 65000,
  },
  {
    id: 21,
    name: 'モンスターパレード 第2弾',
    image: 'monster.jpeg',
    cost: 555,
    left: 63591,
    total: 65001,
  },
  {
    id: 13,
    name: 'ポケモン お楽しみオリパ',
    image: 'gacha-pink.jpeg',
    cost: 100,
    left: 318599,
    total: 319000,
  },
];
const demoItems = [
  {
    id: 1,
    name: 'マリオピカチュウ',
    image: 'mario.jpeg',
    value: 2000000,
    tag: 'PSA・発送限定',
    exchange: false,
  },
  {
    id: 2,
    name: 'ポンチョを着たイーブイ',
    image: 'eevee.png',
    value: 10000,
    tag: 'PSA・発送限定',
    exchange: false,
  },
  {
    id: 3,
    name: 'パレードステッカー',
    image: 'sticker.png',
    value: 100,
    tag: '交換専用',
    exchange: true,
  },
  {
    id: 4,
    name: 'パレードフラッグC',
    image: 'flag.png',
    value: 50,
    tag: '合成素材',
    exchange: true,
  },
  {
    id: 5,
    name: 'パレードバルーン',
    image: 'balloon.png',
    value: 10,
    tag: '合成素材',
    exchange: true,
  },
  {
    id: 6,
    name: 'パレードステッカー',
    image: 'sticker.png',
    value: 100,
    tag: '交換専用',
    exchange: true,
  },
];
const menuItems = [
  ['/me/coupons', 'クーポンを使う', Ticket],
  ['/me/tickets', '所持チケット', Gift],
  ['/me/cards', '獲得商品を確認', Package],
  ['/me/addresses', 'お届け先の登録・変更', MapPin],
  ['/email_update', 'メールアドレスの変更', Mail],
  ['/password_update', 'パスワードの変更', LockKeyhole],
  ['/phone-verification', '電話番号認証', ShieldCheck],
  ['/help', 'ヘルプ・よくある質問', CircleHelp],
] as const;
const notice =
  'この画面はデザインプレビューです。実際の取引や登録情報の変更は行われません。';
function Action({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={'button ' + (secondary ? 'outline-button' : 'primary-button')}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}
function Back() {
  return (
    <a className="text-link" href="/mypage">
      <ArrowLeft size={16} />
      マイページへ戻る
    </a>
  );
}
function FeatureHeading({
  icon,
  eyebrow,
  title,
  description,
  tone = 'lilac',
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  tone?: string;
}) {
  return (
    <div className={'feature-heading ' + tone}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="feature-icon">{icon}</span>
    </div>
  );
}
function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="info-note">
      <CircleHelp size={18} />
      <div>{children}</div>
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
function Detail({ id, routeLabel }: { id: number; routeLabel?: string }) {
  const p = products.find((p) => p.id === id) || products[0];
  return (
    <>
      <PageHeading title={routeLabel||p.name} kicker="GACHA DETAIL" />
      {routeLabel&&<a className="branch-back" href="/choice-gacha?groupId=1"><ArrowLeft size={16}/>ルート選択へ戻る</a>}
      <div className="detail-layout">
        <div className="detail-media">
          <img
            className="detail-image"
            src={'/assets/' + p.image}
            alt={p.name}
          />

        </div>
        <section className="gacha-conditions" aria-label="利用条件">
          <h2>ご利用条件</h2>
          {id !== 13 ? <div><Clock3 size={20}/><p><strong>1日 {id===21?'200,000':'100,000'}口まで</strong><span>毎日0時に回数がリセットされます。</span></p></div> : <p>このガチャに日次の口数制限はありません。</p>}
          <div><Truck size={20}/><p><strong>一部の景品は発送限定です</strong><span>景品ごとの条件をご確認ください。</span></p></div>
        </section>
      </div>
      <aside className="detail-draw-dock" aria-label="ガチャ操作">
        <GachaSummary cost={p.cost} left={p.left} total={p.total}/>
        <Progress value={(p.left/p.total)*100} aria-label="残り口数の割合"/>
        <GachaPlay boxId={p.id} cost={p.cost} name={routeLabel || p.name}/>
      </aside>
      <PrizeLineup boxId={p.id}/>
      <GachaNotes/>

    </>
  );
}
function MembershipSummary({progress=false}:{progress?:boolean}) {
  return <section className="member-status">
    <a className="member-summary" href="/others/help-oripa-rank"><Trophy size={40}/><div><small>現在の会員ランク</small><strong>ブロンズ</strong><span>会員ランクの特典を見る</span></div><ChevronRight size={20}/></a>
    {progress&&<div className="member-progress"><div><span>次のランク：シルバー</span><strong>100,000 / 500,000</strong></div><Progress value={20} aria-label="次の会員ランクへの進捗"/><p>あと <strong>400,000</strong> コイン購入</p></div>}
  </section>;
}
function MyPage() {
  const wallet=useDemoWallet();
  const [copied,setCopied]=useState(false);
  const [logout,setLogout]=useState(false);
  return <div className="member-page">
    <PageHeading title="マイページ"/>
    <div className="member-profile"><span><UserRound size={26}/></span><div><strong>ゲスト 様</strong><small>デザインプレビュー</small></div></div>
    <MembershipSummary/>
    <section className="member-wallet"><div><span>コイン残高</span><Coin value={wallet.balance}/></div><a className="button primary-button" href="/point">チャージ <Plus size={16}/></a><a className="small-link" href="/me/point_expire">コインの有効期限を確認<ChevronRight size={14}/></a></section>
    <a href="/me/megaboost" className="member-boost"><Zap size={27}/><div><strong>PARADEブースト</strong><span>毎月のコイン消費で、翌月に特典を。</span></div><ChevronRight size={20}/></a>
    <div className="account-shortcuts account-page-shortcuts">
      {([["/notification","お知らせ",Bell],["/me/cards","獲得商品",Gift],["/me/tickets","チケット",Ticket],["/coupon","クーポン",Sparkles]] as const).map(([href,label,Icon])=><a key={href} href={href}><Icon size={25}/><span>{label}</span></a>)}
    </div>
    <div className="member-ticket-line"><Ticket size={20}/><span>所持チケット</span><strong>3枚</strong><a href="/me/tickets">確認する<ChevronRight size={16}/></a></div>
    <section className="member-settings"><h2>アカウント</h2><div className="account-menu">{menuItems.map(([href,label,Icon])=><a href={href} key={href}><Icon size={20}/><span>{label}</span><ChevronRight size={16}/></a>)}</div></section>
    <section className="member-invite"><h2>友だちを招待</h2><div className="invite-code"><strong>PARADE</strong><button onClick={async()=>{try{await navigator.clipboard.writeText('PARADE');setCopied(true);}catch{setCopied(false);}}} aria-label="招待コードをコピー"><Copy size={17}/>{copied?'コピーしました':'コピー'}</button></div><small>確認用のサンプルコードです</small></section>
    <button className="logout-button" onClick={()=>setLogout(true)}><LogOut size={18}/>ログアウト</button>
    <PreviewDialog open={logout} onClose={()=>setLogout(false)} title="ログアウトしますか？"><a className="button primary-button" href="/login">ログイン画面を見る</a><Action secondary onClick={()=>setLogout(false)}>キャンセル</Action></PreviewDialog>
  </div>;
}
function Collection() {
  const [tab, setTab] = useState('unselected');
  const [selected, setSelected] = useState<number[]>([]);
  const [changed, setChanged] = useState<number[]>([]);
  const [shipped, setShipped] = useState<number[]>([]);
  const [dialog, setDialog] = useState('');
  const [done, setDone] = useState(false);
  const items = demoItems.filter((i) =>
    tab === 'unselected'
      ? !changed.includes(i.id)
      : tab === 'delivery_waiting'
        ? shipped.includes(i.id)
        : false,
  );
  const chosen = demoItems.filter((i) => selected.includes(i.id));
  const sum = chosen.reduce((a, b) => a + b.value, 0);
  const canExchange = chosen.length > 0 && chosen.every((i) => i.exchange);
  const canShip = chosen.length > 0 && chosen.every((i) => !i.exchange) && sum >= 1500;
  function confirm() {
    if (dialog === 'ship') {
      setChanged([...changed, ...selected]);
      setShipped([...shipped, ...selected]);
    }
    if (dialog === 'exchange') setChanged([...changed, ...selected]);
    setSelected([]);
    setDone(true);
  }
  return (
    <>
      <PageHeading
        title="獲得商品"
        kicker="YOUR TREASURES"
        description="お気に入りはお届け。次のワクワクにはコイン交換。"
      />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(String(v));
          setSelected([]);
        }}
      >
        <TabsList className="parade-tabs">
          <TabsTrigger value="unselected">
            未選択 <span>{demoItems.length - changed.length}</span>
          </TabsTrigger>
          <TabsTrigger value="delivery_waiting">発送待ち</TabsTrigger>
          <TabsTrigger value="deliveried">発送済み</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <div className="collection-layout">
            <div>
              {items.length === 0 ? (
                <Empty
                  title={
                    tab === 'unselected'
                      ? '未選択の商品はありません'
                      : tab === 'delivery_waiting'
                        ? '発送待ちの商品はありません'
                        : '発送済みの商品はありません'
                  }
                  description="商品がある場合はここに表示されます。"
                  href="/oripa/All"
                  label="オリパを探す"
                />
              ) : (
                <>
                  <div className="collection-toolbar">
                    <span>{items.length}件の商品</span>
                    {tab === 'unselected' && (
                      <label>
                        <Checkbox
                          checked={selected.length === items.length}
                          onCheckedChange={(v) =>
                            setSelected(v ? items.map((i) => i.id) : [])
                          }
                        />
                        すべて選択
                      </label>
                    )}
                  </div>
                  <div className="collection-grid">
                    {items.map((item) => (
                      <article
                        className={
                          'item-card ' +
                          (selected.includes(item.id) ? 'item-selected' : '')
                        }
                        key={item.id}
                      >
                        {tab === 'unselected' && (
                          <Checkbox
                            aria-label={item.name + 'を選択'}
                            className="item-checkbox"
                            checked={selected.includes(item.id)}
                            onCheckedChange={(v) =>
                              setSelected(
                                v
                                  ? [...selected, item.id]
                                  : selected.filter((x) => x !== item.id),
                              )
                            }
                          />
                        )}
                        <div className="item-image">
                          <img src={'/assets/' + item.image} alt={item.name} />
                        </div>
                        <span className="small-badge">{item.tag}</span>
                        <h3>{item.name}</h3>
                        <Coin value={item.value} />
                        <p className="expiry">
                          {tab === 'unselected'
                            ? '期限：獲得から7日以内'
                            : '発送準備中（サンプル）'}
                        </p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
            {tab === 'unselected' && (
              <aside className="selection-panel collection-dock" aria-label="選択商品の操作">
                <div className="collection-dock-summary"><strong>選択 {selected.length}点</strong><span>合計 <Coin value={sum}/></span><a href="/mypage/address">お届け先を確認<ChevronRight size={14}/></a></div>
                <div className="collection-dock-actions"><Action disabled={!canShip} onClick={()=>{setDialog('ship');setDone(false);}}><Truck size={18}/>発送手続きへ</Action><Action disabled={!canExchange} secondary onClick={()=>{setDialog('exchange');setDone(false);}}>コインに交換<ArrowRight size={18}/></Action></div>
                <p>発送は合計1,500コイン以上から。発送限定の商品はコイン交換できません。</p>
              </aside>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <PreviewDialog
        open={!!dialog}
        onClose={() => setDialog('')}
        title={
          done
            ? 'プレビュー操作が完了しました'
            : dialog === 'ship'
              ? '発送内容の確認'
              : 'コイン交換の確認'
        }
      >
        {done ? (
          <>
            <CheckCircle2 className="success-icon" />
            <p>{notice}</p>
            <Action onClick={() => setDialog('')}>商品一覧へ戻る</Action>
          </>
        ) : (
          <>
            <p>選択商品：{chosen.length}点</p>
            <Coin value={sum} />
            {dialog === 'ship' && (
              <Info>
                お届け先はサンプルです。実際の発送依頼は送信しません。
              </Info>
            )}
            <Action onClick={confirm}>
              {dialog === 'ship' ? '発送後の表示を確認' : '交換後の表示を確認'}
            </Action>
            <Action secondary onClick={() => setDialog('')}>
              キャンセル
            </Action>
          </>
        )}
      </PreviewDialog>
    </>
  );
}
function Lab() {
  const [category, setCategory] = useState('すべて');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <PageHeading title="合成ラボ" kicker="EXPERIMENT LAB" />
      <FeatureHeading
        icon={<FlaskConical />}
        eyebrow="MIX A LITTLE MAGIC"
        title="まぜて、つくって、新しいお宝。"
        description="集めた素材を組み合わせて、特別なチケットに。"
      />
      <div className="category-pills lab-filters">
        {['すべて', 'フラッグ調合', 'チケット調合', 'パック合成', '交換'].map(
          (c) => (
            <button
              aria-pressed={category === c}
              className={category === c ? 'selected' : ''}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ),
        )}
      </div>
      {category === 'すべて' || category === 'チケット調合' ? (
        <div className="recipe-grid">
          {[0, 1].map((n) => (
            <article className="recipe-card" key={n}>
              <div className="recipe-result">
                <Ticket size={60} />
                <span className="small-badge">チケット調合</span>
              </div>
              <div className="recipe-body">
                <h2>{n ? 'フラッグでチケット交換' : '虹色チケット調合'}</h2>
                <p>虹色フラッグチケット × 1</p>
                <div className="recipe-materials">
                  <h3>必要な素材</h3>
                  <div>
                    <img src="/assets/flag.png" alt="パレードフラッグC" />
                    <span>パレードフラッグC</span>
                    <b>{n ? '0' : '2'} / 1</b>
                  </div>
                  {!n && (
                    <div>
                      <img src="/assets/flag.png" alt="パレードフラッグB" />
                      <span>パレードフラッグB</span>
                      <b>1 / 1</b>
                    </div>
                  )}
                </div>
                <Action
                  disabled={n === 1 || done}
                  onClick={() => setOpen(true)}
                >
                  <FlaskConical size={18} />
                  {done
                    ? '調合済み（サンプル）'
                    : n
                      ? '素材が足りません'
                      : '調合内容を確認'}
                </Action>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="公開中のレシピはありません"
          description="新しいレシピの公開をお楽しみに。"
        />
      )}
      <Info>
        所持上限に達したチケットは調合できません。表示している素材数はサンプルです。
      </Info>
      <PreviewDialog
        open={open}
        onClose={() => setOpen(false)}
        title="虹色チケットを調合"
      >
        <div className="craft-preview">
          <img src="/assets/flag.png" alt="フラッグ素材" />
          <Plus />
          <Ticket size={56} />
          <ArrowRight />
          <Sparkles size={44} />
        </div>
        <p>フラッグCとフラッグBを各1枚使用します。</p>
        <Action
          onClick={() => {
            setDone(true);
            setOpen(false);
          }}
        >
          調合後の表示を確認
        </Action>
        <Action secondary onClick={() => setOpen(false)}>
          キャンセル
        </Action>
      </PreviewDialog>
    </>
  );
}
function HistoryPage() {
  return (
    <>
      <PageHeading
        title="ガチャ履歴"
        kicker="YOUR PARADE HISTORY"
        description="あの日のドキドキと、出会ったお宝たち。"
      />
      <div className="history-list">
        {[0, 1, 2].map((n) => (
          <article key={n} className="history-card">
            <div className="history-meta">
              <span className="small-badge">サンプル履歴</span>
              <span>2026.09.0{7 - n} 12:00</span>
              <Coin value={n === 0 ? 5550 : 100} />
            </div>
            <div className="history-main">
              <img
                src={
                  '/assets/' + (n === 0 ? 'monster.jpeg' : 'gacha-pink.jpeg')
                }
                alt="ガチャ画像"
              />
              <div>
                <h2>
                  {n === 0 ? 'モンスターパレード' : 'ポケモン お楽しみオリパ'}
                </h2>
                <p>{n === 0 ? '10連' : '1回'}ガチャ</p>
                <div className="history-items">
                  {demoItems.slice(2, n === 0 ? 6 : 3).map((i) => (
                    <img src={'/assets/' + i.image} alt={i.name} key={i.id} />
                  ))}
                </div>
              </div>
              <a className="button outline-button" href="/me/cards">
                獲得商品を見る <ArrowRight size={17} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
const packs = [
  500, 1000, 5000, 10000, 50000, 100000, 300000, 300000, 500000, 1000000,
];
function Purchases({ id }: { id?: number }) {
  const wallet=useDemoWallet();
  const [charged,setCharged]=useState(false);
  const [method, setMethod] = useState('card');
  const [modal, setModal] = useState(false);
  return (
    <>
      <PageHeading
        title={id ? '購入内容の確認' : 'コインチャージ'}
        kicker="CHARGE YOUR EXCITEMENT"
        description={
          id
            ? '金額とお支払い方法をご確認ください。'
            : '楽しみたい分だけ、ワクワクをチャージ。'
        }
      />
      {id ? (
        <div className="checkout-layout">
          <Panel title="購入するコイン">
            <div className="checkout-coins">
              <img src="/assets/parade-coin.svg" alt="コイン" />
              <Coin value={packs[id - 1] || 5000} />
            </div>
            <div className="total-row">
              <span>お支払い金額</span>
              <strong>¥{(packs[id - 1] || 5000).toLocaleString()}</strong>
            </div>
            <a className="text-link" href="/point">
              金額を選び直す <ArrowRight size={16} />
            </a>
          </Panel>
          <Panel title="お支払い方法">
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(String(v))}
              aria-label="お支払い方法"
              className="payment-options"
            >
              <label>
                <RadioGroupItem value="card" />
                <CreditCard size={20} />
                <span>クレジットカード</span>
              </label>
            </RadioGroup>
            <Info>
              購入確認画面のデザイン案です。決済サービスの仕様に合わせて接続します。
            </Info>
            <Action onClick={() => setModal(true)}>
              購入確認のプレビュー <ArrowRight size={17} />
            </Action>
            <p className="small-note">実際の請求は発生しません。</p>
          </Panel>
        </div>
      ) : (
        <>
          <div className="charge-balance">
            <div>
              <span>現在の残高</span>
              <Coin value={wallet.balance} />
            </div>
            <ShieldCheck size={30} />
          </div>
          <h2 className="standalone-heading">チャージする金額を選択</h2>
          <div className="coin-pack-grid">
            {packs.map((amount, n) => (
              <a
                href={'/purchases/' + (n + 1)}
                className={
                  'coin-pack ' + (amount === 5000 ? 'recommended' : '')
                }
                key={n}
              >
                {amount === 5000 && (
                  <span className="pack-label">5,000 コイン</span>
                )}
                <img src="/assets/parade-coin.svg" alt="" />
                <strong>{amount.toLocaleString()}</strong>
                <span>コイン</span>
                <div>
                  <b>¥{amount.toLocaleString()}</b>
                  <ArrowRight size={17} />
                </div>
              </a>
            ))}
          </div>
          <Info>
            金額・特典は購入内容の確認画面でご確認ください。プレビュー内の購入操作は送信されません。
          </Info>
        </>
      )}
      <PreviewDialog
        open={modal}
        onClose={() => setModal(false)}
        title="購入内容の確認"
      >
        <Coin value={packs[(id || 1) - 1]} />
        <div className="total-row">
          <span>お支払い</span>
          <strong>¥{packs[(id || 1) - 1].toLocaleString()}</strong>
        </div>
        <Info>
          実際の請求はありません。チャージ後に保有コインを使ってガチャを引く流れを体験できます。
        </Info>
        {charged ? <div className="charge-success"><CheckCircle2/><h2>チャージが完了しました</h2><p>保有コイン：{wallet.balance.toLocaleString()}</p><a className="button primary-button" href="/oripa/Pokemon">ガチャを選ぶ</a></div> : <Action disabled={!wallet.ready} onClick={()=>{wallet.charge(packs[(id||1)-1]);setCharged(true);}}>サンプルコインをチャージ</Action>}
      </PreviewDialog>
    </>
  );
}
function Special({ choice = false, step = 1 }: { choice?: boolean; step?: number }) {
 const p=products.find(p=>p.id===(step===2?13:22))||products[0];
 return <>
  <PageHeading title={choice?'運命の2択ガチャ':'ステップアップガチャ'}/>
  <div className={choice?'branch-entry':'step-depth'}>
   {!choice&&step===1&&<div className="step-next-layer" aria-hidden="true"><span>STEP 2</span></div>}
   <article className="special-front-card">
    {!choice&&<div className="step-current-label"><strong>STEP {step}</strong><span>{step===1?'ここからスタート':'次のステップ'}</span></div>}
    <img className="special-cover" src={'/assets/'+p.image} alt={choice?'運命の2択ガチャ':'STEP '+step+' のガチャ'}/>
    <div className="special-card-info">
     {choice?<><h2>どちらのガチャへ進む？</h2><p>ルートを選んで、専用ガチャの景品を確認できます。</p></>:<><h2>STEP {step}</h2><GachaSummary cost={p.cost} left={p.left} total={p.total}/><Progress value={p.left/p.total*100} aria-label="残り口数の割合"/><p>{step===1?'ガチャ結果を確認したあと、次のSTEPへ進みます。':'STEP 2のガチャです。'}</p></>}
    </div>
   </article>
  </div>
  <aside className="detail-draw-dock special-draw-dock" aria-label={choice?'ルート選択':'ガチャ操作'}>
   {choice?<div className="branch-buttons"><a className="button primary-button" href="/choice-gacha/1">天国ルートへ<ArrowRight size={18}/></a><a className="button primary-button" href="/choice-gacha/2">地獄ルートへ<ArrowRight size={18}/></a></div>:<><GachaSummary cost={p.cost} left={p.left} total={p.total}/><Progress value={p.left/p.total*100} aria-label="残り口数の割合"/><GachaPlay boxId={p.id} cost={p.cost} name={'ステップアップ STEP '+step} resultHref={step===1?'/gacha/result?step=2':'/gacha/result'}/></>}
  </aside>
  {choice?<p className="special-preview-note">各ルートの内容はデザイン確認用のサンプルです。</p>:<><section className="gacha-conditions"><h2>ご利用条件</h2><p>ステップ進行・掲載景品はデザイン確認用のサンプルです。</p></section><PrizeLineup boxId={p.id}/><GachaNotes/></>}
 </>;
}
function Tickets() {
  return (
    <>
      <PageHeading
        title="所持チケット"
        kicker="YOUR SPECIAL PASSES"
        description="特別なワクワクへの、招待状。"
      />
      <div className="ticket-card">
        <div className="ticket-art">
          <Ticket size={70} />
          <span>PARADE PASS</span>
        </div>
        <div className="ticket-body">
          <span className="small-badge">チケット</span>
          <h2>虹色フラッグチケット</h2>
          <p>有効期限なし · 所持上限3枚</p>
          <a className="text-link" href="/lab">
            合成ラボで入手方法を見る <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="ticket-quantity">
          <b>
            3<span>枚</span>
          </b>
          <a className="button primary-button" href="/oripa/All">
            オリパ一覧へ <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </>
  );
}
function Bonus() {
  const [claimed, setClaimed] = useState(false);
  return (
    <>
      <PageHeading title="ログインボーナス" kicker="A LITTLE JOY, EVERY DAY" />
      <div className="bonus-panel">
        <span className="bonus-gift">
          <Gift size={64} />
        </span>
        <span className="eyebrow">WELCOME BACK!</span>
        <h2>今日も、会えてうれしい！</h2>
        <p>毎日ログインして、ワクワクを受け取ろう。</p>
        <div className="bonus-days">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div className={d === 1 ? 'today' : ''} key={d}>
              <span>DAY {d}</span>
              {d === 1 ? (
                claimed ? (
                  <CheckCircle2 />
                ) : (
                  <img src="/assets/parade-coin.svg" alt="コイン" />
                )
              ) : (
                <Gift size={25} />
              )}
              <b>{d === 1 ? '10pt' : '—'}</b>
            </div>
          ))}
        </div>
        <Action disabled={claimed} onClick={() => setClaimed(true)}>
          {claimed ? '受け取り済み（プレビュー）' : '受け取り後の表示を見る'}
        </Action>
        <p className="small-note" role="status">
          {claimed
            ? '受け取り済みの画面表示です。実際の残高は変わりません。'
            : '本日の報酬：10pt（サンプル）'}
        </p>
      </div>
    </>
  );
}
function Notifications() {
  return (
    <>
      <PageHeading title="お知らせ" kicker="" />
      <div className="notification-list">
        {['オリパレードへようこそ', 'ご利用前にご確認ください'].map((t, n) => (
          <details key={t}>
            <summary>
              <span>
                <small>お知らせ · サンプル</small>
                <h2>{t}</h2>
              </span>
              <ChevronRight size={19} />
            </summary>
            <p>
              {n
                ? 'コイン購入や発送など、各手続きの前に表示内容をご確認ください。'
                : 'オリパレードからのお知らせはこちらに表示されます。'}
              <br />
              デザイン確認用のサンプル文面です。
            </p>
          </details>
        ))}
      </div>
    </>
  );
}
function Ranks() {
  return (
    <>
      <PageHeading
        title="会員ランク"
        kicker="LEVEL UP YOUR PARADE"
        description="ランクアップで、もっと広がる楽しみ。"
      />
      <MembershipSummary progress/>
      <section className="rank-explanation"><h2>会員ランクについて</h2><p>コイン購入額に応じてランクアップし、ランクごとの特典を受け取れます。</p></section>
      <Panel title="ランク特典一覧">
        <Table className="parade-table membership-table">
          <TableHeader>
            <TableRow>
              <TableHead>ランク</TableHead>
              <TableHead>ランクアップボーナス</TableHead>
              <TableHead>購入時上乗せ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {['ブロンズ', 'シルバー', 'ゴールド', 'VIP', 'VVIP'].map((r, n) => (
              <TableRow key={r}>
                <TableCell>
                  <span className={'rank-label rank-' + n}>
                    <Trophy size={20} />
                    {r}
                  </span>
                </TableCell>
                <TableCell>
                  {[1000, 5000, 15000, 25000, 50000][n].toLocaleString()} コイン
                </TableCell>
                <TableCell>+0%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="small-note">
          次のランクに必要な購入額を満たすとランクアップできます。特典の数値は調査時の表示に基づきます。
        </p>
      </Panel>
      <Back />
    </>
  );
}
function Boost() {
  return (
    <>
      <PageHeading
        title="PARADEブースト"
        kicker="A BOOST FOR YOUR NEXT PARADE"
      />
      <FeatureHeading
        icon={<Zap />}
        tone="peach"
        eyebrow="PLAY & BOOST"
        title="今月のワクワクが、来月の楽しみに。"
        description="ブロンズランク以上で参加できる、毎月の特典。"
      />
      <Panel title="今月のブーストゲージ">
        <div className="boost-summary">
          <span>来月獲得予定</span>
          <strong>
            60 <small>OB</small>
          </strong>
          <span className="small-badge">サンプル表示</span>
        </div>
        <div className="milestones">
          {[60, 60, 60, 120, 150, 150].map((v, n) => (
            <div key={n} className={n === 0 ? 'reached' : ''}>
              <Zap size={21} />
              <b>{v}</b>
              <span>OB</span>
            </div>
          ))}
        </div>
        <Progress value={18} aria-label="ブーストゲージ" />
      </Panel>
      <div className="guide-grid">
        {[
          [
            '01',
            'コインを使ってゲージをためる',
            '毎月1日から月末までのコイン消費量に応じてゲージが進みます。基準ランクは毎月1日0時に確定します。',
          ],
          [
            '02',
            '翌月1日にまとめて付与',
            'ランクごとのゲージ達成率でOBの付与数が決まります。ビギナーからブロンズに昇格した場合は、その月から参加できます。',
          ],
          [
            '03',
            'OBとコインでガチャに参加',
            'PARADEブーストガチャはOBとコインの両方を使います。OBは付与された月の末日まで有効です。',
          ],
        ].map(([n, t, d]) => (
          <Panel key={n}>
            <span className="guide-number">{n}</span>
            <h2>{t}</h2>
            <p>{d}</p>
          </Panel>
        ))}
      </div>
      <Info>
        OBは翌月に持ち越せません。月途中でランクが上がっても、原則として当月のゲージ基準は変わりません。
      </Info>
      <Back />
    </>
  );
}
function Expiry() {
  const wallet=useDemoWallet();
  return (
    <>
      <PageHeading
        title="コインの有効期限"
        kicker="YOUR COIN BALANCE"
        description="期限の近いコインからご確認ください。"
      />
      <div className="charge-balance">
        <div>
          <span>現在の残高</span>
          <Coin value={wallet.balance} />
        </div>
        <Clock3 size={30} />
      </div>
      <Panel title="失効予定のコイン">
        <Table className="parade-table">
          <TableHeader>
            <TableRow>
              <TableHead>失効期限</TableHead>
              <TableHead>コイン数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ['2026.11.08 23:59', '500'],
              ['2026.11.19 23:59', '2,000'],
              ['2026.12.01 23:59', '10,000'],
            ].map(([date, value]) => (
              <TableRow key={date}>
                <TableCell>{date}</TableCell>
                <TableCell>{value} コイン</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="small-note">日付・残高はデザイン確認用のサンプルです。</p>
      </Panel>
      <Panel title="直近1か月で失効したコイン">
        <p className="muted">失効したコインはありません。</p>
      </Panel>
      <Back />
    </>
  );
}
function Addresses() {
  const [added, setAdded] = useState(false);
  return (
    <>
      <PageHeading
        title="お届け先"
        kicker="DELIVER YOUR TREASURES"
        description="お気に入りのお宝を受け取る場所。"
      />
      {added ? (
        <Panel title="サンプルのお届け先">
          <p>
            パレード 太郎 様<br />
            〒000-0000
            <br />
            住所のサンプル表示
          </p>
          <a href="/mypage/address/demo" className="text-link">
            登録内容を編集 <ArrowRight size={17} />
          </a>
        </Panel>
      ) : (
        <Empty
          title="お届け先を登録しましょう"
          description="発送手続きをスムーズに進めるため、お届け先をご登録ください。"
          href="/mypage/address/new"
          label="お届け先を追加"
        />
      )}
      <div className="demo-state-link">
        <button onClick={() => setAdded(!added)}>
          {added ? '未登録状態を見る' : '登録済みのサンプルを見る'}
        </button>
      </div>
      <Back />
    </>
  );
}
type FieldDef = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  optional?: boolean;
  pattern?: string;
  minLength?: number;
};
function Forms({ route }: { route: string }) {
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const isSignup = route === '/signup';
  const isLogin = route === '/login';
  const address = route.includes('/addresses/');
  const phone = route === '/phone-verification';
  const coupon = route === '/me/coupons';
  const password = route === '/password_update';
  const reset = route === '/password_reset';
  const email = route === '/email_update';
  const titles = address
    ? 'お届け先を登録'
    : isSignup
      ? '新規登録'
      : isLogin
        ? 'ログイン'
        : phone
          ? '電話番号認証'
          : coupon
            ? 'クーポンを使う'
            : password
              ? 'パスワードを変更'
              : reset
                ? 'パスワードを再設定'
                : 'メールアドレスを変更';
  const fields: FieldDef[] = address
    ? [
        { label: '姓', name: 'lastName', placeholder: '山田' },
        { label: '名', name: 'firstName', placeholder: '太郎' },
        { label: 'セイ', name: 'lastNameKana', placeholder: 'ヤマダ' },
        { label: 'メイ', name: 'firstNameKana', placeholder: 'タロウ' },
        {
          label: '郵便番号（ハイフンなし）',
          name: 'postalCode',
          placeholder: '1234567',
          pattern: '[0-9]{7}',
        },
        {
          label: '都道府県・市区町村',
          name: 'address1',
          placeholder: '東京都渋谷区',
        },
        {
          label: '町名・番地・建物名・部屋番号',
          name: 'address2',
          placeholder: '町名以降をご入力ください',
        },
        {
          label: '電話番号（ハイフンなし）',
          name: 'phone',
          type: 'tel',
          placeholder: '09012345678',
          pattern: '[0-9]{10,11}',
        },
      ]
    : coupon
      ? [{ label: 'クーポンコード', name: 'coupon', placeholder: 'DEMO' }]
      : phone
        ? [
            {
              label: '携帯電話番号',
              name: 'phone',
              type: 'tel',
              placeholder: '09012345678',
              pattern: '[0-9]{10,11}',
            },
          ]
        : password
          ? [
              {
                label: '新しいパスワード',
                name: 'password',
                type: 'password',
                minLength: 8,
              },
              {
                label: '新しいパスワード（確認）',
                name: 'confirmPassword',
                type: 'password',
                minLength: 8,
              },
            ]
          : reset || email
            ? [
                {
                  label: email ? '新しいメールアドレス' : 'メールアドレス',
                  name: 'email',
                  type: 'email',
                  placeholder: 'you@example.com',
                },
              ]
            : [
                {
                  label: 'メールアドレス',
                  name: 'email',
                  type: 'email',
                  placeholder: 'you@example.com',
                },
                {
                  label: 'パスワード',
                  name: 'password',
                  type: 'password',
                  minLength: 8,
                },
                ...(isSignup
                  ? [
                      {
                        label: '携帯電話番号',
                        name: 'phone',
                        type: 'tel',
                        placeholder: '09012345678',
                        pattern: '[0-9]{10,11}',
                      },
                      { label: '生年月日', name: 'birthday', type: 'date' },
                      {
                        label: '招待コード',
                        name: 'inviteCode',
                        optional: true,
                        placeholder: 'お持ちの場合のみ',
                      },
                    ]
                  : []),
              ];
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    if (password && f.get('password') !== f.get('confirmPassword')) {
      setError('パスワードが一致していません。');
      return;
    }
    if (isSignup) {
      if (!agreed) {
        setError('利用規約の確認が必要です。');
        return;
      }
      const birth = new Date(String(f.get('birthday'))),
        cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (birth > cutoff) {
        setError('18歳未満の方はご利用いただけません。');
        return;
      }
    }
    if (coupon && String(f.get('coupon')).toUpperCase() !== 'DEMO') {
      setError('このプレビューではサンプルコード「DEMO」をご入力ください。');
      return;
    }
    e.currentTarget.reset();
    setDone(true);
  }
  return (
    <>
      <PageHeading
        title={titles}
        kicker={
          isLogin || isSignup ? 'WELCOME TO THE PARADE' : 'ACCOUNT & SETTINGS'
        }
      />
      <div className={'form-layout ' + (address ? 'address-form-layout' : '')}>
        <section className="form-decoration">
          <span className="eyebrow">ORI PARADE</span>
          <h2>
            {isLogin
              ? 'おかえりなさい。'
              : isSignup
                ? 'ワクワクの列に、\n加わろう。'
                : coupon
                  ? '次のワクワクを、\nもうひとつ。'
                  : address
                    ? 'お宝との出会いを、\nあなたのもとへ。'
                    : '安心して、\nパレードを楽しもう。'}
          </h2>
          <span className="form-deco-icon">
            {address ? (
              <Package />
            ) : coupon ? (
              <Ticket />
            ) : isSignup ? (
              <PartyIcon />
            ) : isLogin ? (
              <Heart />
            ) : (
              <ShieldCheck />
            )}
          </span>
          {isSignup && <p>新規登録で500コインプレゼント</p>}
          <img src="/assets/gacha-pink.jpeg" alt="オリパレードのガチャアート" />
        </section>
        <section className="form-panel">
          {done ? (
            <div className="form-success">
              <CheckCircle2 />
              <h2>
                {coupon
                  ? '特典受け取りのサンプル'
                  : address
                    ? '登録完了画面のサンプル'
                    : isLogin
                      ? 'ログイン後の画面へ'
                      : phone
                        ? 'SMS送信画面のサンプル'
                        : isSignup
                          ? '登録後の画面へ'
                          : '確認完了'}
              </h2>
              <p>{notice}</p>
              {phone && (
                <p>実装時は、SMSで届いた認証コードを次の画面で入力します。</p>
              )}
              <a
                className="button primary-button"
                href={
                  isSignup
                    ? '/phone-verification'
                    : address
                      ? '/me/addresses'
                      : '/me'
                }
              >
                {isSignup ? '電話番号認証画面へ' : 'マイページへ'}
                <ArrowRight size={17} />
              </a>
              <Action secondary onClick={() => setDone(false)}>
                入力画面へ戻る
              </Action>
            </div>
          ) : (
            <>
              <h2>{titles}</h2>
              <p className="form-intro">
                {isLogin
                  ? 'アカウント情報を入力してください。'
                  : isSignup
                    ? '必要な情報を入力して、はじめましょう。'
                    : coupon
                      ? 'お持ちのクーポンコードを入力してください。'
                      : address
                        ? '発送先の情報を入力してください。'
                        : '必要な情報を入力してください。'}
              </p>
              <form
                onSubmit={submit}
                className={address ? 'fields-grid' : 'fields'}
              >
                {fields.map((f, n) => (
                  <label
                    key={f.name}
                    className={'form-field ' + (address && n < 4 ? 'half' : '')}
                    htmlFor={'field-' + f.name}
                  >
                    <span>
                      {f.label}
                      <small>{f.optional ? '任意' : '必須'}</small>
                    </span>
                    <div className="input-wrap">
                      <input
                        id={'field-' + f.name}
                        name={f.name}
                        type={
                          f.type === 'password' && show
                            ? 'text'
                            : f.type || 'text'
                        }
                        placeholder={f.placeholder}
                        required={!f.optional}
                        pattern={f.pattern}
                        minLength={f.minLength}
                        autoComplete="off"
                      />
                      {f.type === 'password' && (
                        <button
                          type="button"
                          aria-label={
                            show ? 'パスワードを隠す' : 'パスワードを表示'
                          }
                          onClick={() => setShow(!show)}
                        >
                          {show ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                      )}
                    </div>
                    {f.type === 'password' && (
                      <span className="field-help">
                        8文字以上で入力してください。
                      </span>
                    )}
                    {f.name === 'birthday' && (
                      <span className="field-help">
                        18歳未満の方はご利用いただけません。
                      </span>
                    )}
                  </label>
                ))}
                {isSignup && (
                  <label className="consent">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                    />
                    <span>
                      <a href="/terms" target="_blank" rel="noreferrer">
                        利用規約
                      </a>
                      を確認しました。
                    </span>
                  </label>
                )}
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                <button
                  className="button primary-button form-submit"
                  type="submit"
                >
                  {isLogin
                    ? 'ログイン画面を確認'
                    : isSignup
                      ? '登録内容を確認'
                      : phone
                        ? 'SMS認証のプレビュー'
                        : coupon
                          ? 'クーポンを確認'
                          : address
                            ? '登録内容を確認'
                            : '変更内容を確認'}
                  <ArrowRight size={18} />
                </button>
              </form>
              <p className="small-note form-privacy">
                デザイン確認用です。実際の個人情報は入力しないでください。入力内容は送信・保存されません。
              </p>
              {isLogin && (
                <a className="small-link" href="/password_reset">
                  パスワードを忘れた方はこちら
                </a>
              )}
              {(isLogin || isSignup) && (
                <div className="auth-switch">
                  {isLogin
                    ? 'アカウントをお持ちでない方'
                    : 'アカウントをお持ちの方'}
                  <a href={isLogin ? '/signup' : '/login'}>
                    {isLogin ? '新規登録' : 'ログイン'}
                    <ChevronRight size={15} />
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
function PartyIcon() {
  return <Sparkles />;
}
function Help({ terms = false }: { terms?: boolean }) {
  return (
    <>
      <PageHeading
        title={terms ? '利用規約' : 'はじめての方へ・ヘルプ'}
        kicker="LET US HELP YOU"
      />
      {terms ? (
        <Panel title="利用規約の表示エリア">
          <Info>
            既存サイトの利用規約本文は取得できていません。正式な規約本文をこの共通レイアウトに配置してください。
          </Info>
          <p>このプレビューでは規約への同意やアカウント作成は行われません。</p>
          <a className="text-link" href="/signup">
            新規登録へ戻る <ArrowRight size={16} />
          </a>
        </Panel>
      ) : (
        <>
          <div className="guide-grid">
            {[
              [
                '01',
                'コインをチャージ',
                '楽しみたい金額を選び、購入内容を確認します。',
                '/purchases',
                'コインチャージへ',
              ],
              [
                '02',
                'オリパを選ぶ',
                '景品や残り口数、必要コインを確認して選びましょう。',
                '/',
                'オリパを探す',
              ],
              [
                '03',
                'お宝を受け取る',
                '獲得商品で発送またはコイン交換を選択します。',
                '/me/cards',
                '獲得商品へ',
              ],
            ].map(([n, t, d, href, label]) => (
              <Panel key={n}>
                <span className="guide-number">{n}</span>
                <h2>{t}</h2>
                <p>{d}</p>
                <a className="text-link" href={href}>
                  {label}
                  <ArrowRight size={16} />
                </a>
              </Panel>
            ))}
          </div>
          <Panel title="よくある質問">
            <div className="faq-list">
              {[
                [
                  'カードの発送期限は？',
                  '発送可能な商品の発送期限は獲得から7日間です。商品の状態を獲得商品ページで確認してください。',
                ],
                [
                  'チケットはどこで確認できる？',
                  'マイページの「所持チケット」からご確認いただけます。合成ラボで手に入るチケットもあります。',
                ],
                [
                  '会員ランクの特典は？',
                  'コイン購入額に応じたランクアップボーナスがあります。詳しい数値は会員ランクページをご確認ください。',
                ],
                [
                  'コインの有効期限は？',
                  'マイページの「コインの有効期限」から期限と失効予定のコイン数を確認できます。',
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <Plus size={18} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
function Result() {
  const wallet=useDemoWallet();
  const draw=wallet.lastDraw;
  const [nextStep,setNextStep]=useState(false);
  useEffect(()=>{setNextStep(new URLSearchParams(window.location.search).get("step")==="2");},[]);
  return (
    <>
      <PageHeading title="ガチャ結果" kicker="YOU FOUND YOUR TREASURES" />
      <div className="result-heading">
        <Sparkles />
        <h2>新しいお宝と、出会えた！</h2>
        <p>{draw ? `${draw.count}回の結果 · ${ (draw.count*draw.cost).toLocaleString()}コイン消費` : "ガチャ結果はまだありません"}</p><small>演出・結果はデザイン確認用のサンプルです。</small>
      </div>
      <div className="result-grid">
        {Array.from({length:draw?.count||0},(_,index)=>({...demoItems[2+index%3],resultId:index})).map((i) => (
          <article className="item-card" key={i.resultId}>
            <div className="item-image">
              <img src={'/assets/' + i.image} alt={i.name} />
            </div>
            <h3>{i.name}</h3>
            <Coin value={i.value} />
          </article>
        ))}
      </div>
      <div className="result-balance">保有コイン：{wallet.balance.toLocaleString()}</div>
      <div className="result-actions">
        {nextStep&&draw&&<a className="button primary-button" href="/step-up/2">STEP 2へ進む<ArrowRight size={18}/></a>}
        <a className="button primary-button" href="/me/cards">
          獲得商品で確認 <Gift size={18} />
        </a>
        <a className="button outline-button" href="/oripa/All">
          オリパ一覧へ
        </a>
      </div>
    </>
  );
}
function DesignSystem() {
  return (
    <>
      <PageHeading
        title="デザインシステム"
        kicker="ORI PARADE / COMPONENTS"
        description="PCとスマートフォンで共通の色・余白・部品。"
      />
      <Panel title="カラーパレット">
        <div className="swatch-grid">
          {[
            ['Parade Orange', '#ff713e'],
            ['Sunshine Yellow', '#ffdb66'],
            ['Magic Purple', '#ded2ff'],
            ['Fresh Mint', '#d9f1e9'],
            ['Ink', '#292534'],
            ['Canvas', '#fffdf9'],
          ].map(([n, c]) => (
            <div key={n}>
              <span style={{ background: c }} />
              <b>{n}</b>
              <small>{c}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="ボタンと状態">
        <div className="component-row">
          <a className="button primary-button" href="/oripa/All">
            メインアクション <ArrowRight size={17} />
          </a>
          <a className="button outline-button" href="/oripa/All">
            サブアクション
          </a>
          <Action disabled>利用条件未達成</Action>
          <span className="small-badge">補足ラベル</span>
        </div>
      </Panel>
      <Panel title="画面一覧">
        <div className="route-index">
          {supportedRoutes
            .filter((x) => !x.startsWith('/purchases/') || x === '/purchases/3')
            .map((route) => (
              <a href={route} key={route}>
                {route}
                <ArrowUpRight size={15} />
              </a>
            ))}
        </div>
      </Panel>
    </>
  );
}
export default function PageScreen({ route }: { route: string }) {
  let content: React.ReactNode;
  if (route.startsWith('/box/'))
    content = <Detail id={Number(route.split('/').pop())} />;
  else if (route === '/me') content = <MyPage />;
  else if (route === '/me/cards') content = <Collection />;
  else if (route === '/lab') content = <Lab />;
  else if (route === '/me/gacha_logs' || route === '/history')
    content = <HistoryPage />;
  else if (route.startsWith('/purchases'))
    content = (
      <Purchases
        id={route === '/purchases' ? undefined : Number(route.split('/').pop())}
      />
    );
  else if (route === '/choice-gacha/1' || route === '/choice-gacha/2') content = <Detail id={route.endsWith('/1')?22:13} routeLabel={route.endsWith('/1')?'天国ルート':'地獄ルート'}/>;
  else if (route === '/step-up/2') content = <Special step={2}/>;
  else if (route === '/step-up' || route === '/choice-gacha')
    content = <Special choice={route === '/choice-gacha'} />;
  else if (route === '/me/tickets') content = <Tickets />;
  else if (route === '/login-bonus') content = <Bonus />;
  else if (route === '/notifications') content = <Notifications />;
  else if (route === '/help/rank') content = <Ranks />;
  else if (route === '/me/megaboost') content = <Boost />;
  else if (route === '/me/point_expire') content = <Expiry />;
  else if (route === '/me/addresses') content = <Addresses />;
  else if (route === '/help' || route === '/terms')
    content = <Help terms={route === '/terms'} />;
  else if (route === '/gacha/result') content = <Result />;
  else if (route === '/design-system') content = <DesignSystem />;
  else content = <Forms route={route} />;
  const isGachaPage=route.startsWith("/box/")||route.startsWith("/choice-gacha")||route.startsWith("/step-up");
  return (
    <div className={isGachaPage ? "screen-shell detail-shell" : "screen-shell utility-shell" + (route === "/me/cards" ? " collection-shell" : "")}>
      <SiteHeader />
      <main className={"page-container subpage " + (isGachaPage ? "reference-detail" : route === "/me/cards" ? "reference-collection" : route === "/design-system" || route === "/lab" ? "reference-wide" : "reference-utility")}>{content}</main>
      <SiteFooter />
    </div>
  );
}
