export function createGateway(baseUrl: string) {
  let token: string | null = null
  return {
    setToken(t: string | null) {
      token = t
    },
    async get<T = any>(path: string): Promise<T> {
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}${path}`, { headers })
      if (!res.ok) throw new Error(`API Error ${res.status}`)
      return res.json()
    },
    async post<T = any>(path: string, body: any): Promise<T> {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`API Error ${res.status}`)
      return res.json()
    },
  }
}
