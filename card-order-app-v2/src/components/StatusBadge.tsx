import type { OrderStatus, ShippingStatus, InvoiceStatus } from "@/types/database";

const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  リクエスト:   "bg-slate-100 text-slate-700",
  発注調整中:   "bg-blue-100 text-blue-800",
  仮確定:       "bg-amber-100 text-amber-800",
  確定:         "bg-emerald-100 text-emerald-800",
  キャンセル:   "bg-rose-100 text-rose-700",
};

const SHIPPING_TONE: Record<ShippingStatus, string> = {
  未出荷: "bg-slate-100 text-slate-700",
  準備中: "bg-blue-100 text-blue-800",
  出荷済: "bg-violet-100 text-violet-800",
  配送中: "bg-indigo-100 text-indigo-800",
  完了:   "bg-emerald-100 text-emerald-800",
};

const INVOICE_TONE: Record<InvoiceStatus, string> = {
  未入金:   "bg-rose-100 text-rose-700",
  一部入金: "bg-amber-100 text-amber-800",
  入金済み: "bg-emerald-100 text-emerald-800",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_TONE[status]}`}>{status}</span>;
}

export function ShippingStatusBadge({ status }: { status: ShippingStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SHIPPING_TONE[status]}`}>{status}</span>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${INVOICE_TONE[status]}`}>{status}</span>;
}
