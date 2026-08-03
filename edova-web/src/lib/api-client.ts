/**
 * Configured gateway instances — the ONE place base URLs and the
 * session-token wiring live. Every remote call in the app goes through one
 * of these; pages/components never call fetch directly.
 *
 * Backend map (dev defaults):
 *   clerkApi   :8001 — clerk (SQLite): gamification, wiki, quiz, resources, uploads
 *   backendApi :8003 — edova-backend (Postgres): auth, classrooms, assignments, calendar
 *   ragApi     :8000 — ncert_rag app (Postgres): RAG chat/query + course CRUD
 *   aiApi      :8002 — edova-camel: AI lesson-plan generation
 */
import { createGateway } from "./api-gateway"

export const clerkApi = createGateway(import.meta.env.VITE_API_URL ?? "http://localhost:8001")

/** Resolved clerk base URL — for the one non-gateway embed (the OKF dashboard
 * iframe on the Knowledge Graph page; clerk keeps the dashboard). Any HTTP
 * call goes through clerkApi instead. */
export const CLERK_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8001").replace(/\/$/, "")
export const backendApi = createGateway(import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003")
export const ragApi = createGateway(import.meta.env.VITE_RAG_API_URL ?? "http://localhost:8000")
export const aiApi = createGateway(import.meta.env.VITE_AI_API_URL ?? "http://localhost:8002")

/** Push the session token into every gateway that serves authed endpoints.
 * Called by lib/auth.ts on login/logout and by the app-store rehydration. */
export function setSessionToken(token: string | null) {
  backendApi.setToken(token)
  clerkApi.setToken(token)
  ragApi.setToken(token)
}

/** Signed-in user pushed into the data layer alongside the token — same push
 * model (login/logout/rehydrate), so lib modules never read UI state. */
export interface SessionUserInfo {
  id: string
  name: string
  role: string
}

let sessionUser: SessionUserInfo | null = null

export function setSessionUser(user: SessionUserInfo | null) {
  sessionUser = user
}

export function getSessionUser(): SessionUserInfo | null {
  return sessionUser
}
