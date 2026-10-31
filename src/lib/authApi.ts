import { saveTokens, clearTokens } from "./api";

const BASE_URL = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL ?? "http://localhost:8000";
const USER_KEY = "pharmerp_user";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

export interface StoredUser {
  name: string;
  role: string;
  phone: string;
}

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<TokenResponse>;
}

export function saveSession(resp: TokenResponse): void {
  saveTokens(resp.access_token, resp.refresh_token);
  try {
    localStorage.setItem(USER_KEY, JSON.stringify({ name: resp.name, role: resp.role, phone: resp.user_id }));
  } catch {}
}

export function clearSession(): void {
  clearTokens();
  try { localStorage.removeItem(USER_KEY); } catch {}
}

export function getSavedUser(): StoredUser | null {
  try {
    const token = localStorage.getItem("pharmerp_token");
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}
