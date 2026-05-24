// テンプレートごとに使える差し込み変数のドキュメント
export const TEMPLATE_VARS: Record<string, string[]> = {
  order_received:    ["company_name", "order_count", "product_titles"],
  order_provisional: ["company_name", "product_title", "provisional_qty"],
  order_confirmed:   ["company_name", "product_title", "confirmed_qty"],
  order_shipped:     ["company_name", "product_title", "tracking_number"],
  invoice_issued:    ["company_name", "invoice_number", "total_amount", "due_date"],
  rank_changed:      ["company_name", "prev_rank", "new_rank", "rebate_rate", "monthly_amount"],
  oath_expiring:     ["company_name", "days_until_expiry", "expiry_date"],
};
