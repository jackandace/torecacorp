import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../utils/api";
import "./OrderPage.css";

// ステータスバッジ
function StatusBadge({ status }) {
  const map = {
    "発注調整中": "badge-yellow",
    "仮確定": "badge-green",
    "確定": "badge-blue",
    "キャンセル": "badge-gray",
  };
  return <span className={`order-badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

// 確認モーダル
function ConfirmModal({ cart, onConfirm, onCancel, submitting }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>発注内容の確認</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <table className="modal-table">
            <thead>
              <tr>
                <th>商品名</th>
                <th>フロー</th>
                <th>希望数</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="modal-item-title">{item.title}</div>
                    {item.modelNumber && item.modelNumber !== "—" && (
                      <div className="modal-item-model">{item.modelNumber}</div>
                    )}
                  </td>
                  <td>
                    <span className={`flow-badge ${item.flowType === "カット割" ? "flow-cut" : "flow-haibun"}`}>
                      {item.flowType}
                    </span>
                  </td>
                  <td className="modal-qty">{item.qty}</td>
                  <td className="modal-notes">{item.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="modal-flow-note">
            <div className="flow-note-item">
              <span className="flow-badge flow-cut">カット割</span>
              担当者が数量を配分・確定後にご連絡します
            </div>
            <div className="flow-note-item">
              <span className="flow-badge flow-haibun">配分確定品</span>
              内容確認後に仮確定→確定の流れで処理されます
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>キャンセル</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? "送信中..." : "発注を確定する"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]); // [{ itemId, title, modelNumber, flowType, qty, notes, remainingQty }]
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [inputNotes, setInputNotes] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet("getInventory");
      // 公開・承認済み・受付中のみ
      const visible = (data.items || []).filter(
        item => item.visible && item.approved && item.status === "受付中"
      );
      setItems(visible);
    } catch (err) {
      showToast("在庫データの取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(item => String(item.id) === String(selectedItemId));

  const handleAddToCart = () => {
    if (!selectedItemId || !inputQty) return;
    const qty = parseInt(inputQty);
    if (isNaN(qty) || qty <= 0) return;

    // すでにカートにある場合は更新
    const existing = cart.findIndex(c => String(c.itemId) === String(selectedItemId));
    if (existing >= 0) {
      const updated = [...cart];
      updated[existing] = { ...updated[existing], qty, notes: inputNotes };
      setCart(updated);
    } else {
      setCart(prev => [...prev, {
        itemId: selectedItem.id,
        title: selectedItem.title,
        fullName: selectedItem.fullName,
        modelNumber: selectedItem.modelNumber,
        flowType: selectedItem.flowType,
        remainingQty: selectedItem.remainingQty,
        qty,
        notes: inputNotes
      }]);
    }
    setSelectedItemId("");
    setInputQty("");
    setInputNotes("");
  };

  const handleRemoveFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const orders = cart.map(c => ({
        itemId: c.itemId,
        qty: c.qty,
        notes: c.notes
      }));
      const result = await apiPost("placeOrder", { email: user.email, orders });
      if (result.error) throw new Error(result.error);
      setCart([]);
      setShowModal(false);
      showToast("発注が完了しました。受付メールをご確認ください。");
      await loadItems();
    } catch (err) {
      showToast(err.message || "発注に失敗しました", "error");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="order-page">
      <header className="order-header">
        <div className="order-header-left">
          <span className="order-logo-mark">P</span>
          <div>
            <div className="order-header-title">発注フォーム</div>
            <div className="order-header-sub">{user?.company} 様</div>
          </div>
        </div>
        <div className="order-header-right">
          <button className="btn btn-ghost" onClick={() => navigate("/mypage")}>マイページ</button>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate("/login"); }}>ログアウト</button>
        </div>
      </header>

      <div className="order-body">
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            {/* 商品選択 */}
            <section className="order-section">
              <h2 className="section-title">商品を選択</h2>
              <div className="order-form-grid">
                <div className="form-group">
                  <label>商品</label>
                  <select
                    value={selectedItemId}
                    onChange={e => { setSelectedItemId(e.target.value); setInputQty(""); setInputNotes(""); }}
                    className="order-select"
                  >
                    <option value="">-- 商品を選択してください --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                        {item.modelNumber && item.modelNumber !== "—" ? `【${item.modelNumber}】` : ""}
                        　{item.flowType === "カット割" ? "🔶カット割" : "🔷配分確定品"}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedItem && (
                  <div className="item-detail-card">
                    <div className="item-detail-row">
                      <span className="item-detail-label">商品名（フル）</span>
                      <span>{selectedItem.fullName || selectedItem.title}</span>
                    </div>
                    <div className="item-detail-row">
                      <span className="item-detail-label">発注可能数</span>
                      <span>{selectedItem.plannedQty}</span>
                    </div>
                    <div className="item-detail-row">
                      <span className="item-detail-label">締切日</span>
                      <span>{selectedItem.orderDeadline || "—"}</span>
                    </div>
                    <div className="item-detail-row">
                      <span className="item-detail-label">掛率</span>
                      <span>{selectedItem.rate || "—"}</span>
                    </div>
                    <div className="item-detail-row">
                      <span className="item-detail-label">区分</span>
                      <span className={`flow-badge ${selectedItem.flowType === "カット割" ? "flow-cut" : "flow-haibun"}`}>
                        {selectedItem.flowType}
                      </span>
                    </div>
                    {selectedItem.notes && (
                      <div className="item-detail-row">
                        <span className="item-detail-label">備考</span>
                        <span className="item-detail-notes">{selectedItem.notes}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="order-qty-row">
                  <div className="form-group">
                    <label>希望数</label>
                    <input
                      type="number"
                      min="1"
                      value={inputQty}
                      onChange={e => setInputQty(e.target.value)}
                      placeholder="例: 10"
                      disabled={!selectedItemId}
                      className="order-qty-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>備考（任意）</label>
                    <input
                      type="text"
                      value={inputNotes}
                      onChange={e => setInputNotes(e.target.value)}
                      placeholder="特記事項があれば入力"
                      disabled={!selectedItemId}
                    />
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleAddToCart}
                    disabled={!selectedItemId || !inputQty}
                  >
                    カートに追加
                  </button>
                </div>
              </div>
            </section>

            {/* カート */}
            <section className="order-section">
              <h2 className="section-title">
                発注リスト
                {cart.length > 0 && <span className="cart-count">{cart.length}件</span>}
              </h2>

              {cart.length === 0 ? (
                <div className="cart-empty">商品をカートに追加してください</div>
              ) : (
                <>
                  <div className="cart-table-wrap">
                    <table className="cart-table">
                      <thead>
                        <tr>
                          <th>商品名</th>
                          <th>区分</th>
                          <th>希望数</th>
                          <th>備考</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <div className="cart-title">{item.title}</div>
                              {item.modelNumber && item.modelNumber !== "—" && (
                                <div className="cart-model">{item.modelNumber}</div>
                              )}
                            </td>
                            <td>
                              <span className={`flow-badge ${item.flowType === "カット割" ? "flow-cut" : "flow-haibun"}`}>
                                {item.flowType}
                              </span>
                            </td>
                            <td className="cart-qty">{item.qty}</td>
                            <td className="cart-notes">{item.notes || "—"}</td>
                            <td>
                              <button className="btn-remove" onClick={() => handleRemoveFromCart(i)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="cart-footer">
                    <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
                      発注内容を確認する →
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      {showModal && (
        <ConfirmModal
          cart={cart}
          onConfirm={handleSubmitOrder}
          onCancel={() => setShowModal(false)}
          submitting={submitting}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
