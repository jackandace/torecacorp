/* Non-catalog pages use their own viewport, with a route-local return link. */
const fullPageOldShell=shell,fullPageOldRender=render;
function isCatalogPage(r){return r==='home'||r.startsWith('category-')||r.startsWith('super-')||r==='legacy-super';}
shell=function(){fullPageOldShell();const full=!isCatalogPage(route());document.documentElement.dataset.fullPage=full?'on':'off';if(full){document.documentElement.dataset.desktopMenu='off';for(const id of ['#header','#category-nav','#footer','#bottom-nav','#desktop-menu'])$(id).innerHTML='';}};
function rewritePageLinks(){document.querySelectorAll('a[href^="#"]').forEach(a=>{const key=a.getAttribute('href').slice(1);if(key)a.setAttribute('href',grimPath(key));});}
render=function(){fullPageOldRender();const r=route();if(!isCatalogPage(r)&&!['mypage','rank','legacy-news','play','effect','result','lab-player'].includes(r)){const parent=r.startsWith('rush-')||r==='tickets'?'rush':r==='jp-gacha'?'jackpot':r==='season'||r.startsWith('legacy-')||r==='history'?'mypage':'home';$('#app').innerHTML=`<div class="page-return"><a href="${grimPath(parent)}">‹ ${parent==='home'?'トップに戻る':'戻る'}</a></div>`+$('#app').innerHTML;}rewritePageLinks();};
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.hash||!url.pathname.startsWith('/'))return;if(url.pathname==='/sp'||url.pathname==='/sp.html')return;e.preventDefault();go(grimRouteFromPath(url.pathname)+url.search);});
window.addEventListener('popstate',()=>{close();render();window.scrollTo(0,0);});
grimCanonicalize();render();
