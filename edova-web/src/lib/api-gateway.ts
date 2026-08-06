/**
 * Single HTTP transport seam for the whole app. One error contract
 * (ApiError with status + server detail), one auth-header assembly, one
 * place base URLs live (lib/api-client.ts). Token is PUSHED in via
 * setToken (on login / session rehydrate) — the data layer never reaches
 * up into UI state.
 */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export interface ApiGateway {
  /** Current bearer token (null when signed out / guest). */
  readonly token: string | null
  setToken(token: string | null): void
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  put<T>(path: string, body?: unknown): Promise<T>
  del<T>(path: string): Promise<T>
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body.detail === "string") return body.detail
    return JSON.stringify(body)
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export function createGateway(baseUrl: string): ApiGateway {
  let token: string | null = null
  const base = baseUrl.replace(/\/$/, "")

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers["Content-Type"] = "application/json"
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new ApiError(res.status, await parseErrorDetail(res))
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    get token() {
      return token
    },
    setToken(next: string | null) {
      token = next
    },
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    del: (path) => request("DELETE", path),
  }
}
