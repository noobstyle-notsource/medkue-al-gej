import axios from "axios";
import { getMockResponse } from "./mockData.js";

// ── Set to false to use a real backend ──
const MOCK_MODE = false;

// ── Real axios instance (used when MOCK_MODE = false) ──
const _axios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
});

function getCookie(name) {
  const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return v ? v[2] : null;
}

_axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_token") || getCookie("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export function setToken(token) {
  localStorage.setItem("crm_token", token);
}

export function clearToken() {
  localStorage.removeItem("crm_token");
}
