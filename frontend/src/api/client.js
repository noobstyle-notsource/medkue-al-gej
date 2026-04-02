import axios from "axios";
import { getMockResponse } from "./mockData.js";

// ── Set to false to use a real backend ──
const MOCK_MODE = false;

// ── Real axios instance (used when MOCK_MODE = false) ──
const _axios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 30000,
});

function getCookie(name) {
  const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return v ? v[2] : null;
}

_axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_token") || sessionStorage.getItem("crm_token") || getCookie("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("[api request] Added Authorization header for:", config.url);
  } else {
    console.warn("[api request] No token found for:", config.url, {
      ls: !!localStorage.getItem("crm_token"),
      ss: !!sessionStorage.getItem("crm_token"),
      cookie: !!getCookie("auth_token")
    });
  }
  return config;
});

_axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      const token = localStorage.getItem("crm_token") || sessionStorage.getItem("crm_token");
      // Only redirect if we actually had a token stored (not first login attempt)
      if (token) {
        clearToken();
        console.warn("[api] 401 received: cleared token and redirecting to /login");
        window.location.href = "/login";
      } else {
        console.warn("[api] 401 received but no token stored - likely new session");
      }
    }
    return Promise.reject(error);
  }
);

// ── Mock layer: returns a real Promise with simulated latency ──
function mockRequest(method, url, data) {
  return new Promise((resolve) => {
    const delay = 150 + Math.random() * 250;
    setTimeout(() => {
      resolve({ data: getMockResponse(method, url, data) });
    }, delay);
  });
}

// ── Exported api object ──
export const api = MOCK_MODE
  ? {
      get:    (url, cfg)       => mockRequest("GET",    url, null),
      post:   (url, data, cfg) => mockRequest("POST",   url, data),
      patch:  (url, data, cfg) => mockRequest("PATCH",  url, data),
      put:    (url, data, cfg) => mockRequest("PUT",    url, data),
      delete: (url, cfg)       => mockRequest("DELETE", url, null),
    }
  : _axios;

export function setToken(token, remember = true) {
  console.log("[api] setToken called:", { remember, tokenLen: token?.length });
  if (remember) {
    localStorage.setItem("crm_token", token);
    sessionStorage.removeItem("crm_token");
    console.log("[api] Token stored in localStorage");
  } else {
    sessionStorage.setItem("crm_token", token);
    localStorage.removeItem("crm_token");
    console.log("[api] Token stored in sessionStorage");
  }
  console.log("[api] Token available for interceptor:", {
    ls: !!localStorage.getItem("crm_token"),
    ss: !!sessionStorage.getItem("crm_token")
  });
}

export function clearToken() {
  localStorage.removeItem("crm_token");
  sessionStorage.removeItem("crm_token");
}
