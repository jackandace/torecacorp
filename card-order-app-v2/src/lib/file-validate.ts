// アップロードファイルの内容 (magic number) を検証する。
// MIME ヘッダや拡張子は偽装可能なため、先頭バイトで実フォーマットを判定する。

export type DetectedType = "pdf" | "jpeg" | "png" | "webp" | "unknown";

export function detectFileType(buf: Buffer): DetectedType {
  if (buf.length < 12) return "unknown";
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  return "unknown";
}

export function isPdf(buf: Buffer): boolean {
  return detectFileType(buf) === "pdf";
}

export function isImage(buf: Buffer): boolean {
  const t = detectFileType(buf);
  return t === "jpeg" || t === "png" || t === "webp";
}

const EXT_BY_TYPE: Record<Exclude<DetectedType, "unknown">, string> = {
  pdf: "pdf", jpeg: "jpg", png: "png", webp: "webp",
};

/** 検出した実フォーマットから安全な拡張子を返す (ファイル名由来の拡張子は使わない) */
export function safeExtension(buf: Buffer): string | null {
  const t = detectFileType(buf);
  return t === "unknown" ? null : EXT_BY_TYPE[t];
}
