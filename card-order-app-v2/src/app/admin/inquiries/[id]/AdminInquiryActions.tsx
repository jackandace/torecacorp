"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InquiryStatus } from "@/types/database";
import { INQUIRY_STATUS_LABEL } from "@/constants/inquiry";

export function AdminInquiryActions({ inquiryId, status }: { inquiryId: string; status: InquiryStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const update = async (newStatus: InquiryStatus) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        className="text-xs border border-slate-300 rounded px-2 py-1"
        value={status}
        disabled={busy}
        onChange={(e) => update(e.target.value as InquiryStatus)}
      >
        {(Object.keys(INQUIRY_STATUS_LABEL) as InquiryStatus[]).map((s) => (
          <option key={s} value={s}>{INQUIRY_STATUS_LABEL[s]}</option>
        ))}
      </select>
    </div>
  );
}
