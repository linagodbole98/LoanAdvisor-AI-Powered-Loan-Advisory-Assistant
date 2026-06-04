import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * On every app load / refresh:
   * 1. Check localStorage for a token
   * 2. Attach it to axios
   * 3. Call GET /auth/me to get the FRESH user object from DB
   *    (this is critical — loanProfile is stored in DB and won't be in localStorage)
   * 4. If the token is expired/invalid, clear storage and redirect to login
   */
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      // Attach token so the /auth/me request is authenticated
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      try {
        const res = await api.get("/auth/me");
        // res.data.user includes loanProfile from MongoDB
        setUser(res.data.user);
      } catch (err) {
        // Token expired or invalid — clear everything
        console.warn("Session restore failed:", err.response?.data?.error || err.message);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    // Store basic user info — loanProfile will be fetched fresh via /auth/me
    localStorage.setItem("user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
  };

  /**
   * refreshUser — call this after submitting the loan profile form
   * so the dashboard immediately sees the updated loanProfile without a page reload.
   */
  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      console.error("Failed to refresh user:", err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};