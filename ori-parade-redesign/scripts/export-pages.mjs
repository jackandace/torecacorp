import fs from 'node:fs';
import path from 'node:path';
const base='/torecacorp/ori-parade-redesign';
const root='dist/client';
function copy(dir,rel='') {
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const r=path.join(rel,e.name),p=path.join(dir,e.name);
 if(e.isDirectory()){copy(p,r);continue;}
 if(e.name==='_headers')continue;
 let dest=r;
 if(r.endsWith('.html') && r!=='index.html' && r!=='404.html')dest=r.slice(0,-5)+'/index.html';
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(/\.(html|js|css|rsc|json)$/.test(r)) {
 let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll('/_next/',base+'/_next/');
 if(r.endsWith('.css'))s=s.replace(/url\((['"]?)\/(fonts|assets)\//g,`url($1${base}/$2/`);
 fs.writeFileSync(dest,s);
 } else fs.copyFileSync(p,dest);
 }
}
copy(root);
