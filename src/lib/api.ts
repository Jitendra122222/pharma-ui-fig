const BASE_URL = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "pharmerp_token";
const REFRESH_KEY = "pharmerp_refresh_token";

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

export function saveTokens(access: string, refresh: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {}
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

async function doFetch(path: string, opts: RequestInit | undefined, token: string | null): Promise<Response> {
  const isForm = typeof FormData !== "undefined" && opts?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(opts?.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${BASE_URL}${path}`, { ...opts, headers });
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await doFetch(path, opts, token);

  if (res.status === 401) {
    const rt = getRefreshToken();
    if (rt) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (refreshRes.ok) {
          const fresh = await refreshRes.json() as { access_token: string; refresh_token: string };
          saveTokens(fresh.access_token, fresh.refresh_token);
          const retry = await doFetch(path, opts, fresh.access_token);
          if (!retry.ok) {
            const msg = await retry.text().catch(() => retry.statusText);
            throw new Error(`API ${retry.status}: ${msg}`);
          }
          return parseBody<T>(retry);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.startsWith("API ")) throw err;
      }
      clearTokens();
    }
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return parseBody<T>(res);
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
