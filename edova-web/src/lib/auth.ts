// Real teacher/admin login against edova-backend's /auth/* (see
// edova-backend/main.py). Guest mode (today's demo-student experience)
// never touches this file at all.
import { backendApi, setSessionToken, setSessionUser } from "./api-client"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: "teacher" | "admin" | "student"
}

export interface LoginResult {
  token: string
  user: SessionUser
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await backendApi.post<LoginResult>("/auth/login", { email, password })
  // Push the session into the gateways + data layer so authed calls carry
  // the bearer without reading UI state.
  setSessionToken(result.token)
  setSessionUser(result.user)
  return result
}

export async function logout(_token: string): Promise<void> {
  try {
    await backendApi.post<{ status: string }>("/auth/logout", {})
  } finally {
    // Best-effort server call — the local session is cleared either way.
    setSessionToken(null)
    setSessionUser(null)
  }
}

// The bearer is the gateway's pushed session token (login/rehydrate); the
// param survives only for signature compatibility.
export function me(_token: string): Promise<SessionUser> {
  return backendApi.get<SessionUser>("/auth/me")
}
