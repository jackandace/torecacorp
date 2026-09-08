/* 表示確認用データ。販売価格・確率・ランク閾値を本番値として使用しない。 */
window.GRIM_DATA = {
  ranks:['ビギナーⅠ',...['ブロンズ','シルバー','ゴールド','プラチナ'].flatMap(n=>['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'].map(s=>n+s)),'ダイヤモンド','VIP'],
  rushes:[{id:'crimson',name:'クリムゾン RUSH',rate:95,price:8000,theme:'',category:'ポケモン',subtitle:'一枚のチケットから、次の当たりへ。'},{id:'ocean',name:'オーシャン RUSH',rate:95,price:8800,theme:'blue',category:'ワンピース',subtitle:'継続するたび、出会いが増える。'},{id:'gold',name:'ゴールド RUSH',rate:98,price:16000,theme:'gold',category:'ポケモン',subtitle:'さらなる継続を、その手に。'}],
  products:[{id:'daily',name:'GRIMジャンボ ログインボーナス',image:'gacha-login.png',price:1,remaining:5272,total:100000,category:'ポケモン',tags:['1日1回限定'],gate:0},{id:'premium',name:'チャージ達成 アド確定オリパ',image:'gacha-premium.png',price:10000,remaining:600,total:600,category:'ポケモン',tags:['チャージ限定'],gate:10000},{id:'normal',name:'GRIM セレクション',image:'gacha-5000.png',price:5000,remaining:988,total:1000,category:'ポケモン',tags:['新着'],gate:5000},{id:'entry',name:'RUSHチケット チャレンジ',image:'gacha-100.png',price:100,remaining:18702,total:50000,category:'ポケモン',tags:['RUSHチケット','新着'],rushIds:['crimson','gold'],sample:true},{id:'ocean-entry',name:'オーシャン チケットチャレンジ',image:'gacha-42.png',price:500,remaining:800,total:1000,category:'ワンピース',tags:['RUSHチケット'],rushIds:['ocean'],sample:true},{id:'entry-plus',name:'RUSHチケット セレクション',image:'gacha-2900.png',price:2900,remaining:4749,total:5000,category:'ポケモン',tags:['RUSHチケット'],rushIds:['crimson','ocean','gold'],sample:true}],
  ranking:[208,204,180,178,177,171,166,164,162,157],
  prizes:[{name:'GRIM セレクション A',value:1800,image:'prize-1.png'},{name:'GRIM セレクション B',value:1300,image:'prize-2.png'},{name:'GRIM セレクション C',value:100,image:'prize-3.png'}],
  results:[2,2,1,2,0,2,1,0],
  gaugeDefaults:()=>Array.from({length:10},(_,g)=>[5,5,10,10,20].map((reward,m)=>({threshold:g*100000+[10000,25000,50000,75000,100000][m],reward})))
};
