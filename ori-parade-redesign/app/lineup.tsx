
import {sitePath} from "../lib/site-path";
import data from './lineup-data.json';
export type PrizeCard={image:string;name:string;quantity:number|null;psa:boolean};
export type PrizeRank={label:string;columns?:number;cards:PrizeCard[]};
export function rankColumns(rank:PrizeRank){return rank.columns|| (rank.cards.length<=2?2:rank.cards.length<=8?3:4);}
export function PrizeLineup({boxId}:{boxId:number}) {
 const ranks:PrizeRank[]=data[String(boxId) as keyof typeof data]||[];
 return <section className="rank-lineup" aria-label="賞ランク別ラインナップ"><h2 className="lineup-title">景品ラインナップ</h2>{ranks.map((rank,index)=><section className={'prize-rank rank-tone-'+Math.min(index,4)} key={rank.label} data-rank={rank.label}>
 <header><h3>{rank.label}</h3><span>{rank.cards.length}種類</span></header>
 <div className={'rank-card-grid cols-'+rankColumns(rank)}>{rank.cards.map((card,n)=><article key={card.image+n}>
 <div className="rank-card-image"><img src={sitePath(card.image)} alt={card.name} loading="lazy"/>{card.psa&&<span className="rank-psa">PSA</span>}</div>
 {card.quantity!==null&&<span className="rank-quantity">× {card.quantity.toLocaleString()}<small>口</small></span>}
 </article>)}</div>
 </section>)}<p className="small-note">実サイトの掲載内容を元にしたデザインプレビューです。</p></section>;
}
const notes=[
 ['傷ありカード／ケースについて','オリパで排出されたカードや鑑定済みカード（ケース）には傷がある場合がございます。'],
 ['鑑定済みカード（PSA）について','鑑定済みカード（PSA）は鑑定機関の定めたグレードを元に販売しております。ケース内部に確認できる傷や異物などに関してのクレームや返品交換は対応いたしかねます。'],
 ['未開封品の状態','未開封品でも外装に傷や凹み、シュリンクの一部に破れ、シール痕などがある場合がございます。また、BOXの再シュリンクの可能性を完全に排除することはできません。届いた梱包物の未開封の状態から開封までの動画撮影を推奨させていただいております。動画内で偽造品と確認できた場合に限り、返品交換の対応致します。'],
 ['商品画像の注意','商品画像はイメージであり、実際のカードの状態や排出状況を保証するものではありません。掲載していないカードも排出される可能性があります。'],
 ['総還元率について','総還元率は、オリパを全て引いた場合の理論値です。'],
 ['排出されるコイン額について','個別の抽選によって得られるカードの設定コイン額はランダムであり、すべての抽選で1口あたりの設定金額を保証するものではございません。'],
 ['返品・交換について','仕様上、商品の交換・返金はできません。'],
 ['販売終了について','予告なく販売を終了することがあります。'],
 ['演出動画について','電波状況／端末／OSによっては演出動画が適切に表示されない可能性がございます。その場合でも問題なく景品は排出されます。なお、利用したコインの再付与・商品への交換・返金対応はご対応致しかねます。'],
 ['発送期限について','発送可能な景品の発送期限は7日間です。7日経過後、発送限定景品は没収・通常景品は強制ポイント交換となりますのでご了承ください。以上、ご了承の上お買い求めください。']
];
export function GachaNotes(){return <section className="gacha-notes"><h2>注意事項</h2>{notes.map(([title,text])=><div key={title}><h3>{title}</h3><p>{text}</p></div>)}</section>;}
