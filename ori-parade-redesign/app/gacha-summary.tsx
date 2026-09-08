import {Coin} from './shared';
export function GachaSummary({cost,left,total}:{cost:number;left:number;total:number}) {
 return <div className="dock-summary gacha-summary"><div><span>1口</span><Coin value={cost}/></div><span>残り <b>{left.toLocaleString()}</b> / {total.toLocaleString()}口</span></div>;
}
