import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await loginWithEmail(email.trim());
      navigate("/order");
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
            <div className="login-title">PALETTE GROUP</div>
            <div className="login-sub">トレカ商事カンパニー 発注システム</div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>登録メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="shop@example.com"
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
          ご登録がお済みでない方は担当者までお問い合わせください。
        </div>
        <hr className="login-divider" />
        <Link to="/admin-login" className="login-admin-link">
          管理者の方はこちら →
        </Link>
      </div>
    </div>
  );
}
