import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','sp.html','styles.css','data.js','app.js','systems.js','renewal.js','renewal.css','rush-lab.js','rush-lab.css','catalog-update.js','catalog-update.css','notifications.js','notifications.css','lineup-detail.js','lineup-detail.css','page-routes.js','full-pages.js','full-pages.css','existing-notices.js','operations-update.js','operations-update.css','pillar-audit.js','pillar-audit.css','confirmed-update.js','confirmed-update.css'])await copyFile(file,`dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
console.log('Static build: dist/');

// Physical route entrypoints support direct open and refresh without a server fallback.
const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');const context=vm.createContext({window:{}});vm.runInContext(await readFile('page-routes.js','utf8'),context);vm.runInContext(await readFile('data.js','utf8'),context);
const routeKeys=vm.runInContext('Object.keys(GRIM_PAGE_PATHS).concat(window.GRIM_DATA.products.map(p=>"product-"+p.id),window.GRIM_DATA.rushes.map(r=>"rush-"+r.id))',context).concat(['category-pokemon','category-onepiece','category-yugioh',...['games','hardware','cosmetics','beauty','food','interior','hobby','gadgets','special'].map(x=>'super-'+x),...['super','purchase','gacha','address','email','password','contact','terms','coupon','rank'].map(x=>'legacy-'+x)]);
for(const key of routeKeys){const path=vm.runInContext('grimPath('+JSON.stringify(key)+')',context);if(path==='/torecacorp/grim-renewal/')continue;await mkdir('dist'+path.replace('/torecacorp/grim-renewal',''),{recursive:true});await copyFile('index.html','dist'+path.replace('/torecacorp/grim-renewal','')+'/index.html');}
console.log('Independent slug entrypoints generated');
