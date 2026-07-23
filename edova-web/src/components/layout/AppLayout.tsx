import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { ChatWidget } from "@/components/chat/ChatWidget"

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-white text-ink">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 pb-16 pt-7">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}
