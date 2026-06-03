import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { authService } from "../services/loanService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
  
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  
    // Verify token is still valid with server
    authService.getMe()
      .then(res => {
        const profile = JSON.parse(localStorage.getItem("loanProfile"));
        setUser({ ...res.data.user, loanProfile: profile || null });
      })
      .catch(() => {
        // Token expired or invalid — clear everything
        localStorage.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    const savedLoanProfile = localStorage.getItem("loanProfile");

    // attach loan profile
    if (savedLoanProfile) {
      userData.loanProfile = JSON.parse(savedLoanProfile);
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    setUser(userData);
  };

  // NEW FUNCTION
  const updateLoanProfile = (loanProfile) => {
    localStorage.setItem("loanProfile", JSON.stringify(loanProfile));

    setUser((prev) => ({
      ...prev,
      loanProfile,
    }));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loanProfile");

    delete api.defaults.headers.common["Authorization"];

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        updateLoanProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
};