import { createContext, useContext, useState, useEffect } from "react";
import { apiGet } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("card_order_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setIsAdmin(parsed.isAdmin || false);
      } catch(e) {
        localStorage.removeItem("card_order_user");
      }
    }
    setLoading(false);
  }, []);

  // ショップログイン: メールアドレス照合
  // ※ approved チェックは顧客マスターD列にTRUEが入ってから有効になる
  const loginWithEmail = async (email) => {
    const data = await apiGet("getCustomers");
    const customers = data.customers || [];
    const found = customers.find(c =>
      String(c.email).trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (!found) throw new Error("このメールアドレスは登録されていません");
    // approved が明示的に false の場合のみブロック（未設定=true扱い）
    if (found.approved === false) {
      throw new Error("アカウントがまだ承認されていません。担当者にお問い合わせください。");
    }
    const userData = { ...found, isAdmin: false };
    setUser(userData);
    setIsAdmin(false);
    localStorage.setItem("card_order_user", JSON.stringify(userData));
    return userData;
  };

  // 管理者ログイン
  const loginAsAdmin = (password) => {
    if (password !== "palette2024admin") throw new Error("パスワードが違います");
    const adminUser = { email: "admin", company: "管理者", name: "管理者", isAdmin: true };
    setUser(adminUser);
    setIsAdmin(true);
    localStorage.setItem("card_order_user", JSON.stringify(adminUser));
    return adminUser;
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem("card_order_user");
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithEmail, loginAsAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
