'use client';
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {useDemoWallet} from './demo-wallet';
export function GachaPlay({boxId,cost,name,resultHref="/gacha/result"}:{boxId:number;cost:number;name:string;resultHref?:string}) {
 const wallet=useDemoWallet();const [open,setOpen]=useState(false);const [count,setCount]=useState('1');const [playing,setPlaying]=useState(false);const busy=useRef(false);
 const needed=Number(count)*cost;const short=needed>wallet.balance;
 useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>window.location.assign(resultHref),3200);return()=>clearTimeout(timer);},[playing,resultHref]);
 function run(){if(busy.current)return;busy.current=true;const result=wallet.draw(boxId,Number(count),cost);if(!result){busy.current=false;return;}setPlaying(true);}
 return <><div className="direct-draw-buttons">{['1','10','100'].map(n=><button key={n} className={'button draw-button draw-count-'+n} onClick={()=>{setCount(n);setOpen(true);busy.current=false;}}>{n==='1'?'1回ガチャ':n+'連ガチャ'}</button>)}</div>
 <Dialog open={open} onOpenChange={v=>{if(!playing)setOpen(v);}}><DialogContent className={'play-dialog '+(playing?'is-playing':'')} onEscapeKeyDown={e=>{if(playing)e.preventDefault();}} onInteractOutside={e=>{if(playing)e.preventDefault();}}>
 <DialogTitle>{playing?'お宝を探しています…':'ガチャ内容の確認'}</DialogTitle>
 <DialogDescription>{playing?'演出プレビューです。実際の抽選は行われません。':name+' · 保有コインから消費します'}</DialogDescription>
 {playing?<div className="gacha-animation"><img src="/assets/parade-puff.png" alt=""/><strong>どんなお宝に出会えるかな？</strong><span>{count}連ガチャ</span><button className="button outline-button" onClick={()=>window.location.assign(resultHref)}>演出をスキップ</button></div>:<>
 <div className="play-balance"><span>保有コイン</span><strong>{wallet.balance.toLocaleString()}</strong></div>
 <RadioGroup className="draw-options" value={count} onValueChange={v=>setCount(String(v))} aria-label="ガチャ回数">{['1','10','100'].map(n=><label key={n} className={count===n?'chosen':''}><RadioGroupItem value={n}/><b>{n}<small>{n==='1'?'回':'連'}</small></b><span>{(Number(n)*cost).toLocaleString()} コイン</span></label>)}</RadioGroup>
 <div className="total-row"><span>消費コイン</span><strong>{needed.toLocaleString()}</strong></div>
 <div className="play-after"><span>ガチャ後の残高</span><strong>{Math.max(0,wallet.balance-needed).toLocaleString()} コイン</strong></div>
 {short?<div className="insufficient-coins"><p>あと {(needed-wallet.balance).toLocaleString()} コイン必要です</p><a className="button primary-button" href="/point">コインをチャージ</a></div>:<button className="button primary-button" disabled={!wallet.ready} onClick={run}>{count==='1'?'1回':count+'連'}ガチャを実行</button>}
 <p className="small-note">デザインプレビュー：サンプル残高のみ変化します。請求・実際の抽選はありません。</p>
 </>}
 </DialogContent></Dialog></>;
}
