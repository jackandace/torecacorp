// docs/MANUAL_*.md から src/manuals/*.ts を再生成する。
// マニュアル本文を更新したら `node scripts/build-manuals.mjs` を実行すること。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function gen(mdName, tsName, exportName) {
  const md = fs.readFileSync(path.join(root, "docs", mdName), "utf8");
  const out =
    `// 自動生成: docs/${mdName} から。編集は docs 側で行い、scripts/build-manuals.mjs で再生成すること。\n` +
    `export const ${exportName} = ${JSON.stringify(md)};\n`;
  fs.writeFileSync(path.join(root, "src", "manuals", tsName), out);
  console.log(`generated src/manuals/${tsName} (${md.length} chars)`);
}

gen("MANUAL_SHOP.md", "shop.ts", "SHOP_MANUAL");
gen("MANUAL_ADMIN.md", "admin.ts", "ADMIN_MANUAL");
