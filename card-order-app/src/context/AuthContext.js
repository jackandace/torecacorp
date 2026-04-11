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
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setIsAdmin(parsed.isAdmin || false);
    }
    setLoading(false);
  }, []);

  const loginWithEmail = async (email) => {
    const data = await apiGet("getCustomers");
    const customers = data.emails || [];
    const found = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error("このメールアドレスは登録されていません");
    const userData = { ...found, isAdmin: false };
    setUser(userData);
    setIsAdmin(false);
    localStorage.setItem("card_order_user", JSON.stringify(userData));
    return userData;
  };

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
