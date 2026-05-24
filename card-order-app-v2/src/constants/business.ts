import type { BusinessType, TaskCategory, TaskStatus, TaskPriority } from "@/types/database";

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  ec_only:          "EC のみ",
  physical_only:    "実店舗のみ",
  physical_and_ec:  "実店舗 + EC",
  other:            "その他",
};

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  invoice:    "請求書発行",
  shipment:   "出荷通知",
  oath:       "宣誓書",
  survey:     "販売店調査",
  inventory:  "在庫",
  onboarding: "新規導入",
  other:      "その他",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open:        "未着手",
  in_progress: "対応中",
  done:        "完了",
  cancelled:   "キャンセル",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low:    "低",
  normal: "中",
  high:   "高",
  urgent: "緊急",
};

export const TASK_PRIORITY_TONE: Record<TaskPriority, string> = {
  low:    "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-800",
  high:   "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-700",
};

export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  open:        "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  done:        "bg-emerald-100 text-emerald-800",
  cancelled:   "bg-slate-100 text-slate-500",
};
