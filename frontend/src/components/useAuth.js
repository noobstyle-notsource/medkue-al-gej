import { useEffect, useMemo, useState } from "react";
import { clearToken, setToken } from "../api/client.js";

function getCookie(name) {
  const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return v ? v[2] : null;
}

/** Decode a JWT payload (no signature verification — for display only) */
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setTokenState] = useState(() => {
    const ls = localStorage.getItem("crm_token") || localStorage.getItem("token");
    const cookie = getCookie("auth_token");
    return ls || cookie;
  });

  // Decode JWT to get user info for display (name, email, id, tenantId)
  const user = useMemo(() => {
    if (!token) return null;
    return decodeJwt(token);
  }, [token]);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    const onStorage = () =>
      setTokenState(localStorage.getItem("crm_token") || localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-login from cookie on first mount if no localStorage token
  useEffect(() => {
    const cookie = getCookie("auth_token");
    if (cookie && !localStorage.getItem("crm_token") && !localStorage.getItem("token")) {
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

  return { token, isAuthed, login, logout, user };
}
