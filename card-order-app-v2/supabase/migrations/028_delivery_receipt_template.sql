-- 028_delivery_receipt_template.sql : 納品完了→受領依頼メールのテンプレート
-- {{receipt_url}} は受領確認ページ(ログイン不要)へのリンク。

INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  ('order_delivered', '納品完了・受領のお願い',
   '【トレカ商事】商品が納品されました（受領のご確認をお願いします）',
   '<p>{{company_name}} 様</p><p>ご注文の商品が納品されました。お手数ですが、下記より<strong>受領のご確認</strong>をお願いいたします。</p><p>商品：{{product_title}}</p><p><a href="{{receipt_url}}">▶ 受領を確認する</a></p><p>※ ボタンを押すと受領完了として記録されます。未確認の場合はログイン時にご案内が表示されます。</p>',
   '{{company_name}} 様

ご注文の商品が納品されました。下記より受領のご確認をお願いいたします。
商品：{{product_title}}

受領確認：{{receipt_url}}
※ リンクを開いて「受領する」を押すと受領完了として記録されます。')
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, subject=EXCLUDED.subject, body_html=EXCLUDED.body_html, body_text=EXCLUDED.body_text, updated_at=now();
