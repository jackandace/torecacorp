import type { InquiryCategory, InquiryStatus, FaqCategory } from "@/types/database";

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  product:  "商品について",
  order:    "発注について",
  invoice:  "請求書・入金について",
  shipping: "発送・配送について",
  account:  "アカウント・パスワード",
  other:    "その他",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  open:          "新規",
  in_progress:   "対応中",
  waiting_shop:  "お客様返信待ち",
  resolved:      "解決済み",
  closed:        "クローズ",
};

export const INQUIRY_STATUS_TONE: Record<InquiryStatus, string> = {
  open:          "bg-rose-100 text-rose-700",
  in_progress:   "bg-blue-100 text-blue-800",
  waiting_shop:  "bg-amber-100 text-amber-800",
  resolved:      "bg-emerald-100 text-emerald-800",
  closed:        "bg-slate-100 text-slate-600",
};

export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  account:  "アカウント",
  order:    "発注",
  invoice:  "請求・入金",
  shipping: "発送",
  product:  "商品",
  rank:     "ランク・リベート",
  other:    "その他",
};
