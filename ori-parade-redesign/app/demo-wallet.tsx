'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
export type DemoDraw={id:string;boxId:number;count:number;cost:number;balanceAfter:number;createdAt:number};
type Wallet={balance:number;lastDraw:DemoDraw|null};
const initial:Wallet={balance:12500,lastDraw:null};
const Context=createContext<{balance:number;lastDraw:DemoDraw|null;ready:boolean;charge:(amount:number)=>void;draw:(boxId:number,count:number,cost:number)=>DemoDraw|null}>({ ...initial,ready:false,charge:()=>{},draw:()=>null });
export function DemoWalletProvider({children}:{children:ReactNode}) {
 const [wallet,setWallet]=useState<Wallet>(initial);const [ready,setReady]=useState(false);const current=useRef(initial);
 useEffect(()=>{try{const value=JSON.parse(sessionStorage.getItem('ori-demo-wallet-v1')||'null');if(value&&Number.isFinite(value.balance)&&value.balance>=0){current.current=value;setWallet(value);}}catch{}setReady(true);},[]);
 const save=(value:Wallet)=>{current.current=value;setWallet(value);try{sessionStorage.setItem('ori-demo-wallet-v1',JSON.stringify(value));}catch{}};
 return <Context.Provider value={{...wallet,ready,charge:(amount)=>{if(ready&&Number.isFinite(amount)&&amount>0)save({...current.current,balance:current.current.balance+amount});},draw:(boxId,count,cost)=>{if(!ready||![1,10,100].includes(count)||cost<=0||current.current.balance<count*cost)return null;const result={id:crypto.randomUUID(),boxId,count,cost,balanceAfter:current.current.balance-count*cost,createdAt:Date.now()};save({balance:result.balanceAfter,lastDraw:result});return result;}}}>{children}</Context.Provider>;
}
export const useDemoWallet=()=>useContext(Context);
