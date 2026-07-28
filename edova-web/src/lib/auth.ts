// Real teacher/admin login against edova-backend's /auth/* (see
// edova-backend/main.py). Guest mode (today's demo-student experience)
// never touches this file at all.
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: "teacher" | "admin"
}

export interface LoginResult {
  token: string
  user: SessionUser
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export function login(email: string, password: string): Promise<LoginResult> {
  return request<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function logout(token: string): Promise<void> {
  return request<{ status: string }>("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).then(() => undefined)
}

export function me(token: string): Promise<SessionUser> {
  return request<SessionUser>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
}
