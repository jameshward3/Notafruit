/** Minimal fetch client: session cookies + Django CSRF. */

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.detail || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

/** API root follows the app base path: "/api/v1" on-prem, "/clerkos/api/v1" when hosted under /clerkos/. */
export const API_BASE = `${import.meta.env.BASE_URL}api/v1`;

async function request<T = any>(method: string, path: string, data?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (data !== undefined) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD"].includes(method)) headers["X-CSRFToken"] = getCookie("csrftoken") || "";
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (response.status === 204) return undefined as T;
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, data?: unknown) => request<T>("POST", path, data),
  patch: <T = any>(path: string, data?: unknown) => request<T>("PATCH", path, data),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
