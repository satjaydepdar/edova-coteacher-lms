import { Navigate, Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { ChatWidget } from "@/components/chat/ChatWidget"
import { useAppStore } from "@/store/app-store"

export function AppLayout() {
  const session = useAppStore((s) => s.session)
  const guestMode = useAppStore((s) => s.guestMode)
  
  if (!session && !guestMode) {
    return <Navigate to="/welcome" replace />
  }

  return (
    <div className="flex min-h-screen w-full bg-white text-ink">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-visible">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 pb-16 pt-7">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}
