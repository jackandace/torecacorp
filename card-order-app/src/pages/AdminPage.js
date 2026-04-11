import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../utils/api";
import * as XLSX from "xlsx";
import "./AdminPage.css";

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("inventory"); // inventory | upload | settings
  const [items, setItems] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const fileRef = useRef();

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [invData, settingsData] = await Promise.all([
        apiGet("getInventory"),
        apiGet("getSettings")
      ]);
      setItems(invData.items || []);
      setSettings(settingsData.settings || {});
    } catch (err) {
      showToast("データ取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy/mm/dd" });
      const dataRows = rows.slice(1).filter(r => r[1]);
      const parsed = dataRows.map(r => ({
          title: r[1] || "",
          fullName: r[2] || "",
          modelNumber: r[3] || "",
          qty: r[4] || "",
          deadline: r[5] || "",
          rate: r[6] ? (String(r[6]).includes("%") ? r[6] : `${Math.round(parseFloat(r[6]) * 100)}%`) : "",
          price: r[7] || "",
          cutType: r[8] || "",
          notes: r[9] || ""
        }));
      setPreview(parsed);
      setTab("upload");
    };
    reader.readAsBinaryString(file);
  };

  const handleApprove = async () => {
    try {
      await apiPost("uploadItems", { items: preview });
      const result = await apiPost("approveItems", {});
      showToast(`${result.addedCount}件を在庫マスターに反映しました`);
      setPreview([]);
      setTab("inventory");
      await loadAll();
    } catch (err) {
      showToast("反映に失敗しました", "error");
    }
  };

  const handleCellEdit = async (rowIndex, field, value) => {
    try {
      await apiPost("updateInventory", { rowIndex: rowIndex + 2, field, value });
      setItems(prev => prev.map((item, i) => i === rowIndex ? { ...item, [field]: value } : item));
      showToast("更新しました");
    } catch (err) {
      showToast("更新に失敗しました", "error");
    }
    setEditingCell(null);
  };

  const handleSettingsSave = async () => {
    try {
      await apiPost("updateSettings", { settings });
      showToast("設定を保存しました");
    } catch (err) {
      showToast("保存に失敗しました", "error");
    }
  };

  const toggleVisible = async (index, current) => {
    await handleCellEdit(index, "visible", !current);
  };

  const toggleApproved = async (index, current) => {
    await handleCellEdit(index, "approved", !current);
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo-mark">P</span>
          <div>
            <div className="admin-header-title">管理画面</div>
            <div className="admin-header-sub">PALETTE GROUP トレカ商事カンパニー</div>
          </div>
        </div>
        <div className="admin-header-right">
          <button className="btn btn-ghost" onClick={() => navigate("/order")}>発注フォームへ</button>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate("/login"); }}>ログアウト</button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-nav">
          {[
            { id: "inventory", label: "在庫管理" },
            { id: "upload", label: "入荷案内アップロード" },
            { id: "settings", label: "設定" }
          ].map(t => (
            <button
              key={t.id}
              className={`admin-nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "upload" && preview.length > 0 && (
                <span className="nav-badge">{preview.length}</span>
              )}
            </button>
          ))}
        </nav>

        <main className="admin-main">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : tab === "inventory" ? (
            <div className="inventory-tab">
              <div className="tab-toolbar">
                <h2 className="tab-title">在庫一覧 <span className="item-count">{items.length}件</span></h2>
                <button className="btn btn-secondary" onClick={loadAll}>更新</button>
              </div>

              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>公開</th>
                      <th>承認</th>
                      <th>タイトル</th>
                      <th>型番</th>
                      <th>入荷予定数</th>
                      <th>受注済み</th>
                      <th>残在庫</th>
                      <th>締切日</th>
                      <th>掛率</th>
                      <th>区分</th>
                      <th>ステータス</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className={!item.visible ? "row-hidden" : !item.approved ? "row-pending" : ""}>
                        <td>
                          <button
                            className={`toggle-btn ${item.visible ? "on" : "off"}`}
                            onClick={() => toggleVisible(i, item.visible)}
                          >
                            {item.visible ? "公開" : "非公開"}
                          </button>
                        </td>
                        <td>
                          <button
                            className={`toggle-btn ${item.approved ? "on" : "off"}`}
                            onClick={() => toggleApproved(i, item.approved)}
                          >
                            {item.approved ? "承認済" : "未承認"}
                          </button>
                        </td>
                        <td className="cell-title">
                          <EditableCell
                            value={item.title}
                            isEditing={editingCell === `${i}-title`}
                            onEdit={() => setEditingCell(`${i}-title`)}
                            onSave={v => handleCellEdit(i, "title", v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                        <td>
                          <EditableCell
                            value={item.modelNumber || "—"}
                            isEditing={editingCell === `${i}-model`}
                            onEdit={() => setEditingCell(`${i}-model`)}
                            onSave={v => handleCellEdit(i, "modelNumber", v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                        <td>
                          <EditableCell
                            value={item.plannedQty || "要確認"}
                            isEditing={editingCell === `${i}-qty`}
                            onEdit={() => setEditingCell(`${i}-qty`)}
                            onSave={v => handleCellEdit(i, "plannedQty", v)}
                            onCancel={() => setEditingCell(null)}
                            type="number"
                          />
                        </td>
                        <td>{item.orderedQty || 0}</td>
                        <td className={Number(item.remainingQty) <= 0 ? "cell-soldout" : Number(item.remainingQty) <= 20 ? "cell-low" : ""}>
                          {item.remainingQty ?? "—"}
                        </td>
                        <td>
                          <EditableCell
                            value={item.orderDeadline || "—"}
                            isEditing={editingCell === `${i}-deadline`}
                            onEdit={() => setEditingCell(`${i}-deadline`)}
                            onSave={v => handleCellEdit(i, "orderDeadline", v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                        <td>{item.rate || "—"}</td>
                        <td>
                          <span className={`badge ${item.cutType?.includes("配分") ? "badge-gold" : "badge-red"}`}>
                            {item.cutType || "—"}
                          </span>
                        </td>
                        <td>
                          <select
                            value={item.status || "受付中"}
                            onChange={e => handleCellEdit(i, "status", e.target.value)}
                            className="status-select"
                          >
                            <option>受付中</option>
                            <option>受付停止</option>
                            <option>終了</option>
                          </select>
                        </td>
                        <td className="cell-notes">
                          <EditableCell
                            value={item.notes || ""}
                            isEditing={editingCell === `${i}-notes`}
                            onEdit={() => setEditingCell(`${i}-notes`)}
                            onSave={v => handleCellEdit(i, "notes", v)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          ) : tab === "upload" ? (
            <div className="upload-tab">
              <div className="tab-toolbar">
                <h2 className="tab-title">入荷案内アップロード</h2>
              </div>

              <div className="upload-area" onClick={() => fileRef.current?.click()}>
                <div className="upload-icon">↑</div>
                <p>橋本さんのExcelファイルをアップロード</p>
                <p className="upload-sub">クリックしてファイルを選択</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>

              {preview.length > 0 && (
                <div className="preview-section">
                  <div className="preview-header">
                    <h3>プレビュー（{preview.length}件）</h3>
                    <div className="preview-actions">
                      <button className="btn btn-secondary" onClick={() => setPreview([])}>キャンセル</button>
                      <button className="btn btn-primary" onClick={handleApprove}>
                        承認して在庫マスターに反映
                      </button>
                    </div>
                  </div>

                  <div className="inventory-table-wrap">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>タイトル</th>
                          <th>商品名</th>
                          <th>型番</th>
                          <th>発注可能数</th>
                          <th>締切日</th>
                          <th>掛率</th>
                          <th>定価</th>
                          <th>区分</th>
                          <th>備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((item, i) => (
                          <tr key={i}>
                            <td className="cell-title">{item.title}</td>
                            <td>{item.fullName}</td>
                            <td>{item.modelNumber || "—"}</td>
                            <td>{item.qty || <span className="cell-warn">要確認</span>}</td>
                            <td>{item.deadline || "—"}</td>
                            <td>{item.rate || "—"}</td>
                            <td>{item.price || "—"}</td>
                            <td><span className={`badge ${item.cutType?.includes("配分") ? "badge-gold" : "badge-red"}`}>{item.cutType || "—"}</span></td>
                            <td className="cell-notes">{item.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="settings-tab">
              <div className="tab-toolbar">
                <h2 className="tab-title">システム設定</h2>
                <button className="btn btn-primary" onClick={handleSettingsSave}>保存</button>
              </div>

              <div className="settings-grid">
                <div className="card">
                  <h3 className="settings-section-title">通知設定</h3>
                  <div className="form-group">
                    <label>エラー通知先メール</label>
                    <input
                      type="email"
                      value={settings["通知先メール"] || ""}
                      onChange={e => setSettings({ ...settings, "通知先メール": e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>管理者メール</label>
                    <input
                      type="email"
                      value={settings["管理者メール"] || ""}
                      onChange={e => setSettings({ ...settings, "管理者メール": e.target.value })}
                    />
                  </div>
                </div>

                <div className="card">
                  <h3 className="settings-section-title">管理者パスワード変更</h3>
                  <div className="form-group">
                    <label>新しいパスワード</label>
                    <input type="password" placeholder="変更する場合のみ入力" />
                  </div>
                  <p className="settings-note">※パスワード変更はGASのコードを直接編集してください</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function EditableCell({ value, isEditing, onEdit, onSave, onCancel, type = "text" }) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (isEditing) {
    return (
      <div className="editable-cell editing">
        <input
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") onSave(val);
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
        <div className="editable-actions">
          <button onClick={() => onSave(val)}>✓</button>
          <button onClick={onCancel}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editable-cell" onClick={onEdit} title="クリックして編集">
      {value || <span className="cell-empty">—</span>}
      <span className="edit-icon">✎</span>
    </div>
  );
}
