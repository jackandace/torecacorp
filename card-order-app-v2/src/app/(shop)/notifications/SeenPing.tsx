"use client";

import { useEffect } from "react";
import { NOTICES_EVENT } from "@/lib/notices-client";

/** お知らせのタブを開いて既読にした直後に、ナビの🔔の件数を取り直させる */
export function SeenPing({ tab }: { tab: string }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(NOTICES_EVENT));
  }, [tab]);
  return null;
}
