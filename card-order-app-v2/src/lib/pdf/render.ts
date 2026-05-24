// React-PDF レンダリング (Node ランタイム)
//
// Vercel Edge では @react-pdf/renderer がフルサポートされないため、
// 呼び出し側の API route で `export const runtime = "nodejs"` を指定すること。
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdfToBuffer(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element);
}
