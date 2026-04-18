import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../utils/api";
import "./MyPage.css";

function StatusBadge({ status }) {
  const map = {
    "発注調整中": "badge-yellow",
    "仮確定": "badge-green",
    "確定": "badge-blue",
    "キャンセル": "badge-gray",
  };
  return <span className={`status-badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("getMyOrders", { email: user.email });
      // 新しい順に並べる
      const sorted = (data.orders || []).sort((a, b) => b.id - a.id);
      setOrders(sorted);
    } catch (err) {
      setError("発注履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => o.status !== "確定" && o.status !== "キャンセル");
  const pastOrders = orders.filter(o => o.status === "確定" || o.status === "キャンセル");

  return (
    <div className="mypage">
      <header className="mypage-header">
        <div className="mypage-header-left">
          <span className="mypage-logo-mark">P</span>
          <div>
            <div className="mypage-header-title">マイページ</div>
            <div className="mypage-header-sub">{user?.company} 様</div>
          </div>
        </div>
        <div className="mypage-header-right">
          <button className="btn btn-primary" onClick={() => navigate("/order")}>発注フォームへ</button>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate("/login"); }}>ログアウト</button>
        </div>
      </header>

      <div className="mypage-body">
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {/* 進行中の発注 */}
            <section className="mypage-section">
              <div className="section-header">
                <h2 className="section-title">進行中の発注 <span className="count-badge">{activeOrders.length}</span></h2>
                <button className="btn btn-ghost btn-sm" onClick={loadOrders}>更新</button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="empty-state">進行中の発注はありません</div>
              ) : (
                <div className="order-cards">
                  {activeOrders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-card-header">
                        <div className="order-card-title">{order.title}</div>
                        <StatusBadge status={order.status} />
                      </div>
                      {order.modelNumber && <div className="order-card-model">{order.modelNumber}</div>}
                      <div className="order-card-body">
                        <div className="order-card-row">
                          <span className="order-card-label">区分</span>
                          <span className={`flow-badge ${order.flowType === "カット割" ? "flow-cut" : "flow-haibun"}`}>
                            {order.flowType}
                          </span>
                        </div>
                        <div className="order-card-row">
                          <span className="order-card-label">希望数</span>
                          <span>{order.requestedQty}</span>
                        </div>
                        {order.provisionalQty !== null && (
                          <div className="order-card-row highlight">
                            <span className="order-card-label">仮確定数</span>
                            <span className="highlight-value">{order.provisionalQty}</span>
                          </div>
                        )}
                        {order.confirmedQty !== null && (
                          <div className="order-card-row highlight confirmed">
                            <span className="order-card-label">確定数</span>
                            <span className="highlight-value">{order.confirmedQty}</span>
                          </div>
                        )}
                        {order.adminNote && (
                          <div className="order-card-row">
                            <span className="order-card-label">担当者より</span>
                            <span className="admin-note">{order.adminNote}</span>
                          </div>
                        )}
                        <div className="order-card-row">
                          <span className="order-card-label">発注日時</span>
                          <span className="order-card-date">{order.timestamp}</span>
                        </div>
                      </div>
                      {/* ステータス説明 */}
                      <div className="order-card-status-note">
                        {order.status === "発注調整中" && "🔶 担当者が数量を確定後、仮確定のご連絡をします"}
                        {order.status === "仮確定" && "🔷 内容をご確認ください。問題なければ担当者が確定処理を行います"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 過去の発注 */}
            {pastOrders.length > 0 && (
              <section className="mypage-section">
                <h2 className="section-title">過去の発注</h2>
                <div className="past-orders-table-wrap">
                  <table className="past-orders-table">
                    <thead>
                      <tr>
                        <th>発注日時</th>
                        <th>商品名</th>
                        <th>区分</th>
                        <th>希望数</th>
                        <th>確定数</th>
                        <th>ステータス</th>
                        <th>確定日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastOrders.map(order => (
                        <tr key={order.id} className={order.status === "キャンセル" ? "row-canceled" : ""}>
                          <td className="cell-date">{order.timestamp}</td>
                          <td>
                            <div>{order.title}</div>
                            {order.modelNumber && <div className="cell-model">{order.modelNumber}</div>}
                          </td>
                          <td>
                            <span className={`flow-badge ${order.flowType === "カット割" ? "flow-cut" : "flow-haibun"}`}>
                              {order.flowType}
                            </span>
                          </td>
                          <td>{order.requestedQty}</td>
                          <td>{order.confirmedQty ?? "—"}</td>
                          <td><StatusBadge status={order.status} /></td>
                          <td className="cell-date">{order.confirmedAt || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
