-- =========================================================================
-- 008_notification_templates_v2.sql
-- 通知テンプレートに変数差し込みを実装したバージョン
-- 既存テンプレートを UPSERT で更新
-- =========================================================================

INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  (
    'order_received',
    '発注リクエスト受領',
    '【トレカ商事】発注リクエストを受け付けました',
    '<p>{{company_name}} 様</p>
<p>発注リクエストを受け付けました。担当より追ってご連絡いたします。</p>
<p>件数: {{order_count}} 件 / 商品: {{product_titles}}</p>
<p>※ 本メールは送信専用です。</p>',
    '{{company_name}} 様

発注リクエストを受け付けました。担当より追ってご連絡いたします。

件数: {{order_count}} 件
商品: {{product_titles}}

※ 本メールは送信専用です。'
  ),
  (
    'order_provisional',
    '仮確定通知',
    '【トレカ商事】ご発注内容が仮確定しました',
    '<p>{{company_name}} 様</p>
<p>ご発注内容が仮確定となりました。マイページよりご確認ください。</p>
<p>商品: {{product_title}} / 仮確定数量: {{provisional_qty}} BOX</p>',
    '{{company_name}} 様

ご発注内容が仮確定となりました。
商品: {{product_title}}
仮確定数量: {{provisional_qty}} BOX

マイページよりご確認ください。'
  ),
  (
    'order_confirmed',
    '確定通知',
    '【トレカ商事】ご発注内容が確定しました',
    '<p>{{company_name}} 様</p>
<p>以下の発注内容が確定しました。</p>
<p>商品: {{product_title}} / 確定数量: {{confirmed_qty}} BOX</p>
<p>請求書の発行までしばらくお待ちください。</p>',
    '{{company_name}} 様

ご発注内容が確定しました。
商品: {{product_title}}
確定数量: {{confirmed_qty}} BOX

請求書の発行までしばらくお待ちください。'
  ),
  (
    'order_shipped',
    '発送通知',
    '【トレカ商事】商品を発送しました',
    '<p>{{company_name}} 様</p>
<p>ご注文の商品を発送いたしました。</p>
<p>商品: {{product_title}}<br>追跡番号: {{tracking_number}}</p>',
    '{{company_name}} 様

ご注文の商品を発送いたしました。
商品: {{product_title}}
追跡番号: {{tracking_number}}'
  ),
  (
    'invoice_issued',
    '請求書発行通知',
    '【トレカ商事】請求書を発行しました ({{invoice_number}})',
    '<p>{{company_name}} 様</p>
<p>請求書を発行しました。</p>
<ul>
  <li>請求書番号: {{invoice_number}}</li>
  <li>請求合計: ¥{{total_amount}}</li>
  <li>支払期限: {{due_date}}</li>
</ul>
<p>マイページの請求書一覧よりPDFをダウンロードできます。</p>',
    '{{company_name}} 様

請求書を発行しました。
請求書番号: {{invoice_number}}
請求合計: ¥{{total_amount}}
支払期限: {{due_date}}

マイページよりPDFをダウンロードできます。'
  ),
  (
    'rank_changed',
    'ランク変動通知',
    '【トレカ商事】会員ランクが変更されました',
    '<p>{{company_name}} 様</p>
<p>会員ランクが {{prev_rank}} から {{new_rank}} に変更されました。</p>
<p>新しいリベート率: {{rebate_rate}}</p>
<p>今月の発注額: ¥{{monthly_amount}}</p>',
    '{{company_name}} 様

会員ランクが {{prev_rank}} から {{new_rank}} に変更されました。
新しいリベート率: {{rebate_rate}}
今月の発注額: ¥{{monthly_amount}}'
  ),
  (
    'oath_expiring',
    '宣誓書失効アラート',
    '【トレカ商事】宣誓書の更新が必要です',
    '<p>{{company_name}} 様</p>
<p>宣誓書の失効日が {{days_until_expiry}} 日後に迫っています ({{expiry_date}})。</p>
<p>更新手続きをお願いします。</p>',
    '{{company_name}} 様

宣誓書の失効日が {{days_until_expiry}} 日後に迫っています ({{expiry_date}})。
更新手続きをお願いします。'
  )
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  subject   = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();
