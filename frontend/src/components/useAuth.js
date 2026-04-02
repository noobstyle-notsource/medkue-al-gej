import { useEffect, useMemo, useState } from "react";
import { api, clearToken, setToken } from "../api/client.js";

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
    const ls = localStorage.getItem("crm_token") || localStorage.getItem("crm_session_token") || localStorage.getItem("token");
    const ss = sessionStorage.getItem("crm_token");
    const cookie = getCookie("auth_token");
    const t = ls || ss || cookie;

    if (!t || t === "null" || t === "undefined") return null;
    return t;
  });

  const [profile, setProfile] = useState(null);

  const user = useMemo(() => {
    if (profile) return profile;
    if (!token) return null;
    return decodeJwt(token);
  }, [profile, token]);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  const refreshProfile = async () => {
    if (!token) {
      setProfile(null);
      return;
    }

    try {
      console.log("[useAuth] Fetching profile with token:", token.substring(0, 20) + "...");
      const res = await api.get("/auth/me");
      console.log("[useAuth] Profile loaded successfully:", res.data);
      setProfile(res.data);
    } catch (err) {
      console.warn("[useAuth] refreshProfile failed:", {
        message: err.message,
        status: err?.response?.status,
        token: token.substring(0, 20) + "..."
      });
      // Don't immediately clear token - the interceptor will handle 401
      if (err?.response?.status === 401) {
        // Token might be invalid, but don't clear it - let interceptor decide
        console.warn("[useAuth] Got 401 but keeping token in storage for now");
      } else {
        setProfile(null); // Only clear profile on non-401 errors
      }
    }
  };

  useEffect(() => {
    if (token) {
      console.log("[useAuth] Token changed, fetching profile");
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [token]);

  useEffect(() => {
    const onStorage = () => {
      setTokenState(localStorage.getItem("crm_token") || sessionStorage.getItem("crm_token") || localStorage.getItem("token"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-login from cookie on first mount if no storage token
  useEffect(() => {
    const cookie = getCookie("auth_token");
    if (cookie && !localStorage.getItem("crm_token") && !sessionStorage.getItem("crm_token") && !localStorage.getItem("token")) {
      setToken(cookie, true); // Default to persistent if from cookie?
      setTokenState(cookie);
    }
  }, []);

  const login = (newToken, remember = true) => {
    setToken(newToken, remember);
    setTokenState(newToken);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
  };

  return { token, isAuthed, login, logout, user, refreshProfile };
}
