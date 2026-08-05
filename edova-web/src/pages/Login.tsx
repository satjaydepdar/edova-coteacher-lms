import { useState, useEffect } from "react"
import { Navigate, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store/app-store"

type RoleTab = "student" | "teacher" | "admin"

const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: "student", label: "Student" },
  { key: "teacher", label: "Teacher" },
  { key: "admin", label: "Admin" },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const login = useAppStore((s) => s.login)
  const continueAsGuest = useAppStore((s) => s.continueAsGuest)
  const session = useAppStore((s) => s.session)
  const guestMode = useAppStore((s) => s.guestMode)

  const searchParams = new URLSearchParams(location.search)
  const defaultRole = (searchParams.get("role") as RoleTab) || "student"

  const [role, setRole] = useState<RoleTab>(defaultRole)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Already signed in (persisted) or already chose Guest this page load --
  // skip straight into the app instead of re-prompting.
  if (session || guestMode) {
    return <Navigate to="/" replace />
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await login(email, password, role)
      const loggedInRole = useAppStore.getState().session?.user.role
      navigate(loggedInRole === "student" ? "/learning" : "/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setSubmitting(false)
    }
  }

  function handleGuest() {
    continueAsGuest()
    navigate("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-[380px] rounded-[16px] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-ink font-display text-[18px] font-extrabold text-sidebar-text">
            E
          </div>
          <div>
            <div className="font-display text-[16px] font-bold leading-tight text-ink">Edova</div>
            <div className="text-[11px] font-semibold tracking-[0.08em] text-text-secondary">
              COTEACHER
            </div>
          </div>
        </div>

        <h1 className="font-display text-[24px] font-bold leading-tight text-ink">
          Welcome back to Edova
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
          Sign in to continue your learning streak.
        </p>

        <form onSubmit={handleSignIn} className="mt-6">
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Role
            </label>
            <div className="mt-2 flex items-center gap-1 rounded-full bg-[#F3EFE3] p-[3px]">
              {ROLE_TABS.map((t) => {
                const active = role === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setRole(t.key); setError("") }}
                    className="flex-1 cursor-pointer rounded-full px-3 py-1.5 text-[14px] font-semibold transition-colors"
                    style={{
                      background: active ? "#16332B" : "transparent",
                      color: active ? "#fff" : "#6B7280",
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="login-email" className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@edova.in"
              className="mt-2 h-11 rounded-[10px] text-[14px]"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="login-password" className="text-[12px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-2 h-11 rounded-[10px] text-[14px]"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-[8px] bg-[#FBEBD6] px-3 py-2.5 text-[12.5px] text-[#8A4B1F]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !email || !password}
            className="mt-5 h-11 w-full rounded-[10px] text-[14.5px]"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleGuest}
            className="mt-2.5 h-11 w-full rounded-[10px] text-[14.5px]"
          >
            Continue as Guest
          </Button>
        </form>
      </div>
    </div>
  )
}
