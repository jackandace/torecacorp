import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function AdminLoginPage() {
  const { loginAsAdmin } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      loginAsAdmin(password);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-mark">P</span>
          <div>
            <div className="login-title">管理者ログイン</div>
            <div className="login-sub">PALETTE GROUP トレカ商事カンパニー</div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>管理者パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              autoFocus
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>

        <div className="login-note">
          <a href="/login" style={{color: "var(--text3)", fontSize: "12px"}}>← ショップログインはこちら</a>
        </div>
      </div>
    </div>
  );
}
