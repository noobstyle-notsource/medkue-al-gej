import { useEffect, useMemo, useState } from "react";
import { clearToken, setToken } from "../api/client.js";

function getCookie(name) {
  const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return v ? v[2] : null;
}

export function useAuth() {
  const [token, setTokenState] = useState(() => {
    const ls = localStorage.getItem("token");
    const cookie = getCookie("auth_token");
    // Prefer localStorage; if none but cookie exists, use cookie
    return ls || cookie;
  });
  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    const onStorage = () => setTokenState(localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-login from cookie on first mount if no localStorage token
  useEffect(() => {
    const cookie = getCookie("auth_token");
    if (cookie && !localStorage.getItem("token")) {
      setToken(cookie);
      setTokenState(cookie);
    }
  }, []);

  const login = (newToken) => {
    setToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
  };

  return { token, isAuthed, login, logout };
}

