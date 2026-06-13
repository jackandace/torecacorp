// 日本語フォント登録 (React-PDF)
//
// 既定の Helvetica は日本語グリフを持たず、請求書/領収書の和文が空白になる。
// Noto Sans JP (JP サブセット OTF) を同梱して登録する。
// Vercel では関数バンドルにフォントを含める必要があるため、next.config の
// outputFileTracingIncludes で本ファイルパスを明示的にトレース対象へ含めている。
import { Font } from "@react-pdf/renderer";
import path from "node:path";

export const JP_FONT_FAMILY = "NotoSansJP";

let registered = false;

export function registerJpFont(): void {
  if (registered) return;
  const fontPath = path.join(process.cwd(), "src/lib/pdf/fonts/NotoSansJP-Regular.otf");
  // Regular のみ同梱。bold(700) 指定でも未登録ウェイトエラーにならないよう
  // 同じファイルを normal/bold 両ウェイトにマップする (太字は視覚的には同じ太さ)。
  Font.register({
    family: JP_FONT_FAMILY,
    fonts: [
      { src: fontPath, fontWeight: 400 },
      { src: fontPath, fontWeight: 700 },
    ],
  });
  // 和文は単語区切りが無いため任意位置で改行できるようにする
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
