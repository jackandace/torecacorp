import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../utils/api";
import "./OrderPage.css";

const MAX_SLOTS = 5;

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

export default function OrderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [slots, setSlots] = useState([
    { itemId: "", qty: "", notes: "" }
  ]);
  const [submitted, setSubmitted] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await apiGet("getInventory");
      const available = (data.items || []).filter(item =>
        item.approved && item.visible && item.status !== "終了"
      );
      setItems(available);
    } catch (err) {
      showToast("商品情報の取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) return;
    setSlots([...slots, { itemId: "", qty: "", notes: "" }]);
  };

  const removeSlot = (i) => {
    if (slots.length <= 1) return;
    setSlots(slots.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i, field, value) => {
    setSlots(slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const getItem = (itemId) => items.find(item => String(item.id) === String(itemId));

  const getRemainingQty = (itemId) => {
    const item = getItem(itemId);
    if (!item) return null;
    const remaining = Number(item.remainingQty);
    return isNaN(remaining) ? null : remaining;
  };

  const isItemSoldOut = (itemId) => {
    const remaining = getRemainingQty(itemId);
    return remaining !== null && remaining <= 0;
  };

  const getAvailableItems = (currentSlotIndex) => {
    const selectedIds = slots
      .filter((_, i) => i !== currentSlotIndex)
      .map(s => s.itemId)
      .filter(Boolean);
    return items.filter(item => !selectedIds.includes(String(item.id)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validSlots = slots.filter(s => s.itemId && s.qty);
    if (validSlots.length === 0) {
      showToast("商品を1つ以上選択してください", "warning");
      return;
    }

    for (const slot of validSlots) {
      const remaining = getRemainingQty(slot.itemId);
      if (remaining !== null && Number(slot.qty) > remaining) {
        const item = getItem(slot.itemId);
        showToast(`「${item?.title}」の在庫が不足しています（残${remaining}BOX）`, "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const orders = validSlots.map(s => ({
        itemId: s.itemId,
        qty: Number(s.qty),
        notes: s.notes
      }));
      const result = await apiPost("placeOrder", { email: user.email, orders });
      if (result.success) {
        setSubmitted(true);
        showToast("発注が完了しました！", "success");
      } else {
        showToast("発注処理でエラーが発生しました", "error");
      }
    } catch (err) {
      showToast("通信エラーが発生しました", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="order-page">
        <div className="order-success">
          <div className="success-icon">✓</div>
          <h2>発注完了</h2>
          <p>ご発注ありがとうございます。<br />担当者より確認後ご連絡いたします。</p>
          <button className="btn btn-secondary" onClick={() => { setSubmitted(false); setSlots([{ itemId: "", qty: "", notes: "" }]); loadItems(); }}>
            続けて発注する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-page">
      <header className="order-header">
        <div className="order-header-left">
          <span className="order-logo-mark">P</span>
          <div>
            <div className="order-header-title">発注フォーム</div>
            <div className="order-header-company">{user?.company}</div>
          </div>
        </div>
        <div className="order-header-right">
          <button className="btn btn-ghost" onClick={() => { logout(); navigate("/login"); }}>
            ログアウト
          </button>
        </div>
      </header>

      <div className="order-content">
        <div className="order-notice">
          <span className="notice-icon">ℹ</span>
          最大{MAX_SLOTS}商品まで同時に発注できます。BOX単位でご入力ください（12BOX = 1CT）
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="slots">
              {slots.map((slot, i) => {
                const selectedItem = getItem(slot.itemId);
                const remaining = slot.itemId ? getRemainingQty(slot.itemId) : null;
                const availableItems = getAvailableItems(i);

                return (
                  <div key={i} className="slot-card">
                    <div className="slot-header">
                      <span className="slot-num">商品 {i + 1}</span>
                      {slots.length > 1 && (
                        <button type="button" className="btn btn-ghost slot-remove" onClick={() => removeSlot(i)}>
                          ✕ 削除
                        </button>
                      )}
                    </div>

                    <div className="slot-body">
                      <div className="form-group">
                        <label>商品を選択</label>
                        <select value={slot.itemId} onChange={e => updateSlot(i, "itemId", e.target.value)}>
                          <option value="">-- 商品を選択してください --</option>
                          {availableItems.map(item => {
                            const isSoldOut = isItemSoldOut(String(item.id));
                            const rem = Number(item.remainingQty);
                            const label = `${item.title}${item.modelNumber ? `【${item.modelNumber}】` : ""} ${isSoldOut ? "（売切）" : rem > 0 ? `（残${rem}BOX）` : ""}`;
                            return (
                              <option key={item.id} value={String(item.id)} disabled={isSoldOut}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {selectedItem && (
                        <div className="item-detail">
                          <div className="item-detail-row">
                            <span className="item-detail-label">商品名</span>
                            <span>{selectedItem.title}</span>
                          </div>
                          {selectedItem.modelNumber && (
                            <div className="item-detail-row">
                              <span className="item-detail-label">型番</span>
                              <span>{selectedItem.modelNumber}</span>
                            </div>
                          )}
                          <div className="item-detail-row">
                            <span className="item-detail-label">発注締切</span>
                            <span>{selectedItem.orderDeadline || "—"}</span>
                          </div>
                          <div className="item-detail-row">
                            <span className="item-detail-label">区分</span>
                            <span className={`badge ${selectedItem.cutType?.includes("配分") ? "badge-gold" : "badge-red"}`}>
                              {selectedItem.cutType || "—"}
                            </span>
                          </div>
                          {remaining !== null && (
                            <div className="item-detail-row">
                              <span className="item-detail-label">残在庫</span>
                              <span className={remaining <= 10 ? "text-warning" : "text-success"}>
                                {remaining}BOX
                              </span>
                            </div>
                          )}
                          {selectedItem.notes && (
                            <div className="item-detail-row">
                              <span className="item-detail-label">備考</span>
                              <span className="item-notes">{selectedItem.notes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="slot-inputs">
                        <div className="form-group">
                          <label>希望数量（BOX単位）</label>
                          <input
                            type="number"
                            min="1"
                            max={remaining || undefined}
                            value={slot.qty}
                            onChange={e => updateSlot(i, "qty", e.target.value)}
                            placeholder="例：24"
                          />
                        </div>
                        <div className="form-group">
                          <label>備考（任意）</label>
                          <input
                            type="text"
                            value={slot.notes}
                            onChange={e => updateSlot(i, "notes", e.target.value)}
                            placeholder="カット了承など"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {slots.length < MAX_SLOTS && (
              <button type="button" className="btn btn-secondary add-slot-btn" onClick={addSlot}>
                + 商品を追加（{slots.length}/{MAX_SLOTS}）
              </button>
            )}

            <div className="order-terms">
              <p>■ 発注確定後は数量変更・キャンセルは一切お受けできません</p>
              <p>■ 取引手数料として2.2%をいただいております</p>
              <p>■ カット・分納の可能性がございます</p>
              <p>■ 送料はご注文金額または地域により別途発生する場合がございます</p>
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
              {submitting ? "送信中..." : "発注を確定する"}
            </button>
          </form>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
