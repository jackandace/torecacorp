/* v2: 累計課金（円）、当月課金（円）、当月対象消費（Pt）を別管理。 */
window.GRIM_SYSTEMS = {
  ranks: [
    ['BEGINNER',1,49,0,100000,'#8c94a4'],
    ['BRONZE',50,99,100000,300000,'#bc784f'],
    ['SILVER',100,199,300000,1000000,'#a2b4c7'],
    ['GOLD',200,299,1000000,3000000,'#d7ab48'],
    ['PLATINUM',300,399,3000000,5000000,'#86c9ce'],
    ['EMERALD',400,499,5000000,8000000,'#3fc395'],
    ['DIAMOND',500,599,8000000,15000000,'#72b7ef'],
    ['MASTER',600,699,15000000,25000000,'#a782e5'],
    ['GRAND MASTER',700,799,25000000,35000000,'#de7ab8'],
    ['MYTHIC',800,998,35000000,50000000,'#ff7864'],
    ['LEGEND',999,999,50000000,null,'#ffe29a']
  ].map(([name,minLv,maxLv,min,max,color])=>({name,minLv,maxLv,min,max,color})),
  themes: {
    classic:{name:'GRIM STANDARD',title:'AUTUMN CHALLENGE',primary:'#b20d28',background:'#f6f6f8',track:'#e4d9dc',fill:'#b20d28',panel:'#341320',accent:'#edc078',tip:'✦',decor:'✧'},
    christmas:{name:'CHRISTMAS',title:'WINTER GIFT SEASON',primary:'#af1739',background:'#fbf5f5',track:'#ecdddd',fill:'#d33750',panel:'#243e39',accent:'#f6d6a2',tip:'🛷',decor:'❄'},
    newyear:{name:'NEW YEAR',title:'NEW YEAR CELEBRATION',primary:'#a31c27',background:'#faf7ee',track:'#e7dfc9',fill:'#b98b39',panel:'#351f24',accent:'#eedc9e',tip:'✦',decor:'✿'},
    spring:{name:'SAKURA',title:'SAKURA COLLECTION',primary:'#ad416f',background:'#fff7fa',track:'#f1d4e0',fill:'#d578a0',panel:'#542c45',accent:'#ffd4df',tip:'🌸',decor:'✿'},
    summer:{name:'SUMMER',title:'SUMMER ADVENTURE',primary:'#087eaa',background:'#f1fafc',track:'#cce8ed',fill:'#20b8c8',panel:'#113d5c',accent:'#f9d885',tip:'🌴',decor:'☀'},
    autumn:{name:'AUTUMN',title:'AUTUMN HARVEST',primary:'#ad4a26',background:'#fcf7ef',track:'#eedeca',fill:'#d78032',panel:'#49291d',accent:'#edc078',tip:'🍁',decor:'✧'},
    halloween:{name:'HALLOWEEN',title:'MIDNIGHT REWARDS',primary:'#8f45b8',background:'#f6f2fa',track:'#ded0e8',fill:'#f49a33',panel:'#281536',accent:'#f8b05d',tip:'🎃',decor:'✦'},
    anniversary:{name:'ANNIVERSARY',title:'GRIM ANNIVERSARY',primary:'#8256b6',background:'#f8f6fc',track:'#e5d9f0',fill:'#cfa33c',panel:'#211831',accent:'#f2d184',tip:'♛',decor:'✦'}
  },
  milestones:[
    {amount:10000,name:'スタート特典',kind:'特典Pt',qty:100,icon:'◉'},
    {amount:25000,name:'チケット特典',kind:'RUSHチケット',qty:1,icon:'ϟ'},
    {amount:50000,name:'ステップ特典',kind:'クーポン',qty:1,icon:'◇'},
    {amount:100000,name:'プレミアム特典',kind:'RUSHチケット',qty:2,icon:'ϟ'},
    {amount:200000,name:'FINAL REWARD',kind:'限定商品',qty:1,icon:'♛'}
  ]
};
const SYS=window.GRIM_SYSTEMS;
function rankFor(total){
  total=Math.max(0,Math.floor(Number(total)||0));
  const rank=[...SYS.ranks].reverse().find(r=>total>=r.min);
  if(rank.max===null)return {...rank,level:999,stars:Math.floor((total-50000000)/5000000),next:50000000+(Math.floor((total-50000000)/5000000)+1)*5000000,total};
  const count=rank.maxLv-rank.minLv+1;
  const level=Math.min(rank.maxLv,rank.minLv+Math.floor((total-rank.min)*count/(rank.max-rank.min)));
  const next=rank.min+Math.ceil((level-rank.minLv+1)*(rank.max-rank.min)/count);
  return {...rank,level,stars:0,next,total};
}
function seasonProgress(amount,milestones){
  const next=milestones.find(m=>amount<m.amount);
  return {next,remaining:next?next.amount-amount:0,percent:Math.min(100,100*amount/milestones.at(-1).amount),achieved:milestones.filter(m=>amount>=m.amount).length};
}
function jpProgress(amount,gauges){
  const milestones=gauges.flat();
  return {earned:milestones.filter(m=>amount>=m.threshold).reduce((s,m)=>s+m.reward,0),next:milestones.find(m=>amount<m.threshold)};
}
