// =========================================================================
// Supabase 型定義 (手書き / supabase gen types で再生成可能)
// =========================================================================

export type RankCode = "platinum" | "gold" | "silver" | "bronze" | "standard";
export type ShopStatus = "pending" | "active" | "suspended";
export type BusinessType = "ec_only" | "physical_only" | "physical_and_ec" | "other";
export type ProductCategory = "pokemon" | "onepiece" | "other";
export type ProductStatus = "受付中" | "受付停止" | "終了";
export type FlowType = "haibun" | "cut";
export type OrderStatus =
  | "リクエスト"
  | "発注調整中"
  | "仮確定"
  | "確定"
  | "キャンセル";
export type ShippingStatus =
  | "未出荷"
  | "準備中"
  | "出荷済"
  | "配送中"
  | "完了";
export type OrderUnit = "BOX" | "CT";
export type InvoiceStatus = "未入金" | "一部入金" | "入金済み";
export type NotificationChannel = "email" | "inapp";
export type NotificationStatus = "queued" | "sent" | "failed";
export type BatchStatus = "success" | "failure" | "partial";
export type UserRole = "shop" | "admin" | "super_admin";
export type TaskCategory = "invoice" | "shipment" | "oath" | "survey" | "inventory" | "onboarding" | "other";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type RankChangeStatus = "pending" | "applied" | "failed" | "cancelled";
export type InquiryCategory = "product" | "order" | "invoice" | "shipping" | "account" | "other";
export type InquiryStatus = "open" | "in_progress" | "waiting_shop" | "resolved" | "closed";
export type FaqCategory = "account" | "order" | "invoice" | "shipping" | "product" | "rank" | "other";

// -------- Row types -------------------------------------------------------

export type Shop = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  delivery_address: string | null;
  current_rank: RankCode;
  rank_locked_until: string | null;
  rate_override: number | null;
  status: ShopStatus;
  oath_signed_at: string | null;
  oath_expires_at: string | null;
  user_id: string | null;
  // 010 migration で追加
  business_type: BusinessType | null;
  opened_at: string | null;
  business_doc_url: string | null;
  lifetime_amount: number;
  // 015 migration で追加
  terms_agreed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RegistrationInvite = {
  id: string;
  token: string;
  email: string | null;
  company_name: string | null;
  note: string | null;
  expires_at: string;
  used_at: string | null;
  used_by_shop_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type RankSetting = {
  rank: RankCode;
  threshold_amount: number;
  rebate_rate: number;
  updated_at: string;
};

export type ShopRankHistory = {
  id: string;
  shop_id: string;
  month: string;
  prev_rank: RankCode;
  new_rank: RankCode;
  monthly_amount: number;
  rebate_rate: number;
  changed_at: string;
};

export type Product = {
  id: string;
  series: string | null;
  title: string;
  full_name: string | null;
  model_number: string | null;
  category: ProductCategory;
  actual_rate: number;
  rate_markup: number;
  price: number | null;
  planned_qty: number | null;
  ordered_qty: number;
  ct_to_box: number;
  min_order_box: number;
  cut_type: string | null;
  flow_type: FlowType;
  image_url: string | null;
  is_visible: boolean;
  is_approved: boolean;
  order_deadline: string | null;
  status: ProductStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Order = {
  id: string;
  shop_id: string;
  product_id: string;
  order_unit: OrderUnit;
  requested_qty: number;
  requested_qty_box: number | null;
  provisional_qty: number | null;
  confirmed_qty: number | null;
  listed_rate: number;
  rebate_rate: number;
  unit_price: number | null;
  subtotal: number | null;
  rebate_amount: number | null;
  total_price: number | null;
  status: OrderStatus;
  shipping_status: ShippingStatus;
  tracking_number: string | null;
  consent_agreed_at: string;
  admin_note: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Invoice = {
  id: string;
  shop_id: string;
  invoice_number: string;
  rank_at_issue: RankCode;
  subtotal: number;
  rebate_rate: number;
  rebate_amount: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  is_legacy: boolean;
  issued_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  order_id: string;
  line_total: number;
  created_at: string;
};

export type AuditLog = {
  id: string;
  shop_id: string | null;
  admin_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

export type BatchLog = {
  id: string;
  batch_name: string;
  status: BatchStatus;
  processed_count: number;
  error_count: number;
  error_detail: string | null;
  started_at: string;
  finished_at: string | null;
};

export type NotificationTemplate = {
  id: string;
  code: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  shop_id: string | null;
  template_code: string | null;
  channel: NotificationChannel;
  subject: string;
  body: string;
  sent_at: string | null;
  status: NotificationStatus;
  error_detail: string | null;
  created_at: string;
};

export type Survey = {
  id: string;
  shop_id: string;
  surveyed_at: string;
  surveyor: string | null;
  content: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StaffProfile = {
  user_id: string;
  display_name: string;
  department: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RankSettingsChange = {
  id: string;
  rank: RankCode;
  old_threshold: number;
  old_rebate_rate: number;
  new_threshold: number;
  new_rebate_rate: number;
  effective_from: string;
  status: RankChangeStatus;
  applied_at: string | null;
  error_detail: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  shop_id: string;
  subject: string;
  body: string;
  related_product_id: string | null;
  related_model: string | null;
  category: InquiryCategory;
  status: InquiryStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  last_reply_by: string | null;
  last_reply_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type InquiryMessage = {
  id: string;
  inquiry_id: string;
  from_user_id: string | null;
  from_kind: "shop" | "admin";
  body: string;
  created_at: string;
};

export type Faq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StaffTask = {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string | null;
  related_shop_id: string | null;
  related_invoice_id: string | null;
  related_order_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// -------- Database スキーマ ------------------------------------------------

type Relation = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<R, Rel extends readonly Relation[] = []> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: Rel;
};

type FK<T extends string, C extends readonly string[], R extends string, RC extends readonly string[]> = {
  foreignKeyName: T;
  columns: C;
  isOneToOne: false;
  referencedRelation: R;
  referencedColumns: RC;
};

export type Database = {
  public: {
    Tables: {
      shops:                  TableDef<Shop>;
      rank_settings:          TableDef<RankSetting>;
      shop_rank_history:      TableDef<ShopRankHistory, [
        FK<"shop_rank_history_shop_id_fkey", ["shop_id"], "shops", ["id"]>,
      ]>;
      products:               TableDef<Product>;
      orders:                 TableDef<Order, [
        FK<"orders_shop_id_fkey",    ["shop_id"],    "shops",    ["id"]>,
        FK<"orders_product_id_fkey", ["product_id"], "products", ["id"]>,
      ]>;
      invoices:               TableDef<Invoice, [
        FK<"invoices_shop_id_fkey", ["shop_id"], "shops", ["id"]>,
      ]>;
      invoice_items:          TableDef<InvoiceItem, [
        FK<"invoice_items_invoice_id_fkey", ["invoice_id"], "invoices", ["id"]>,
        FK<"invoice_items_order_id_fkey",   ["order_id"],   "orders",   ["id"]>,
      ]>;
      audit_logs:             TableDef<AuditLog, [
        FK<"audit_logs_shop_id_fkey", ["shop_id"], "shops", ["id"]>,
      ]>;
      batch_logs:             TableDef<BatchLog>;
      notification_templates: TableDef<NotificationTemplate>;
      notifications:          TableDef<Notification, [
        FK<"notifications_shop_id_fkey", ["shop_id"], "shops", ["id"]>,
      ]>;
      surveys:                TableDef<Survey, [
        FK<"surveys_shop_id_fkey", ["shop_id"], "shops", ["id"]>,
      ]>;
      staff_profiles:         TableDef<StaffProfile>;
      staff_tasks:            TableDef<StaffTask, [
        FK<"staff_tasks_related_shop_id_fkey",    ["related_shop_id"],    "shops",    ["id"]>,
        FK<"staff_tasks_related_invoice_id_fkey", ["related_invoice_id"], "invoices", ["id"]>,
        FK<"staff_tasks_related_order_id_fkey",   ["related_order_id"],   "orders",   ["id"]>,
      ]>;
      rank_settings_changes:  TableDef<RankSettingsChange>;
      inquiries:              TableDef<Inquiry, [
        FK<"inquiries_shop_id_fkey",            ["shop_id"],            "shops",    ["id"]>,
        FK<"inquiries_related_product_id_fkey", ["related_product_id"], "products", ["id"]>,
      ]>;
      inquiry_messages:       TableDef<InquiryMessage, [
        FK<"inquiry_messages_inquiry_id_fkey", ["inquiry_id"], "inquiries", ["id"]>,
      ]>;
      faqs:                   TableDef<Faq>;
      registration_invites:   TableDef<RegistrationInvite>;
    };
    Views: { [_ in never]: never };
    Functions: {
      increment_product_ordered_qty: {
        Args: { p_product_id: string; p_delta: number };
        Returns: void;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
