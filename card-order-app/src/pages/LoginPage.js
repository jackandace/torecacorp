import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const [mode, setMode] = useState("customer"); // customer | admin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginWithEmail, loginAsAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "customer") {
        await loginWithEmail(email);
        navigate("/order");
      } else {
        loginAsAdmin(password);
        navigate("/admin");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />
      </div>

      <div className="login-container">
        <div className="login-logo">
          <span className="login-logo-mark">P</span>
          <div className="login-logo-text">
            <span className="login-logo-title">PALETTE GROUP</span>
            <span className="login-logo-sub">トレカ商事カンパニー</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === "customer" ? "active" : ""}`}
              onClick={() => { setMode("customer"); setError(""); }}
            >
              ショップログイン
            </button>
            <button
              className={`login-tab ${mode === "admin" ? "active" : ""}`}
              onClick={() => { setMode("admin"); setError(""); }}
            >
              管理者
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === "customer" ? (
              <>
                <p className="login-desc">ショップ登録時のメールアドレスでログインしてください</p>
                <div className="form-group">
                  <label>メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="shop@example.com"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <p className="login-desc">管理者パスワードを入力してください</p>
                <div className="form-group">
                  <label>パスワード</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? "確認中..." : "ログイン"}
            </button>
          </form>

          <p className="login-footer">
            ショップ登録がお済みでない方は<br />
            担当者までお問い合わせください
          </p>
        </div>
      </div>
    </div>
  );
}
