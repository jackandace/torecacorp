-- =========================================================================
-- 020_deposit_billing.sql
-- カット品の保証金(前受金) → 最終精算(差額請求/返金) 対応
-- Supabase SQL Editor で手動実行。
-- =========================================================================

-- 1. invoices に請求種別・親請求・前受金充当額を追加
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_kind text NOT NULL DEFAULT 'normal'
    CHECK (invoice_kind IN ('normal','deposit','final','refund'));

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS parent_invoice_id uuid NULL REFERENCES public.invoices(id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deposit_applied integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoices_parent ON public.invoices(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_kind   ON public.invoices(invoice_kind);

-- 2. invoice_items: 1発注が deposit と final の両方に出現できるよう
--    order_id 単独の一意制約を (invoice_id, order_id) に変更
DROP INDEX IF EXISTS public.uq_invoice_items_order;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_items_invoice_order
  ON public.invoice_items(invoice_id, order_id);

-- 3. 通知テンプレート (保証金・最終精算・返金)
INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  (
    'deposit_invoice_issued',
    '保証金(前受金)請求',
    '【トレカ商事】保証金(前受金)のご請求 {{invoice_number}}',
    '<p>{{company_name}} 様</p>
<p>カット対象商品のご発注につき、保証金(前受金・税抜)としてご請求いたします。</p>
<p>請求番号: {{invoice_number}} / 保証金額: ¥{{total_amount}}</p>
<p>配分確定後に最終金額を精算し、差額のご請求または返金を行います。</p>',
    '{{company_name}} 様

カット対象商品のご発注につき、保証金(前受金・税抜)としてご請求いたします。

請求番号: {{invoice_number}}
保証金額: ¥{{total_amount}}

配分確定後に最終金額を精算し、差額のご請求または返金を行います。'
  ),
  (
    'final_invoice_issued',
    '最終精算(差額)請求',
    '【トレカ商事】最終精算のご請求 {{invoice_number}}',
    '<p>{{company_name}} 様</p>
<p>配分が確定しましたので最終精算いたします。お預かりの保証金を充当した差額をご請求いたします。</p>
<p>請求番号: {{invoice_number}} / 今回ご請求額: ¥{{total_amount}}</p>',
    '{{company_name}} 様

配分が確定しましたので最終精算いたします。
お預かりの保証金を充当した差額をご請求いたします。

請求番号: {{invoice_number}}
今回ご請求額: ¥{{total_amount}}'
  ),
  (
    'refund_notice_issued',
    '返金のご案内(支払通知書)',
    '【トレカ商事】返金のご案内 {{invoice_number}}',
    '<p>{{company_name}} 様</p>
<p>配分確定の結果、お預かりの保証金が最終金額を上回りましたので、差額を返金いたします。</p>
<p>返金番号: {{invoice_number}} / 返金額: ¥{{total_amount}}</p>
<p>支払通知書をご確認のうえ、振込先をご連絡ください。</p>',
    '{{company_name}} 様

配分確定の結果、お預かりの保証金が最終金額を上回りましたので、差額を返金いたします。

返金番号: {{invoice_number}}
返金額: ¥{{total_amount}}

支払通知書をご確認のうえ、振込先をご連絡ください。'
  )
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  subject   = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();
