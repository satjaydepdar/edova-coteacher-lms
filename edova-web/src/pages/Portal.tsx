import { useNavigate } from "react-router-dom"
import { BookOpen, GraduationCap, Building2 } from "lucide-react"

export default function Portal() {
  const navigate = useNavigate()

  const roles = [
    {
      id: "teacher",
      title: "Teacher",
      description: "Manage classes, assignments, and access your AI co-teacher dashboard.",
      icon: <BookOpen className="size-8 text-[#16332B]" />,
      color: "bg-[#F3EFE3]",
    },
    {
      id: "student",
      title: "Student",
      description: "Access your learning hub, complete assignments, and track progress.",
      icon: <GraduationCap className="size-8 text-[#8A4B1F]" />,
      color: "bg-[#FBEBD6]",
    },
    {
      id: "admin",
      title: "School Admin",
      description: "Manage users, view school analytics, and configure platform settings.",
      icon: <Building2 className="size-8 text-[#1a365d]" />,
      color: "bg-[#e2e8f0]",
    }
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="mb-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-[12px] bg-ink font-display text-[28px] font-extrabold text-sidebar-text">
            E
          </div>
        </div>
        <h1 className="font-display text-[32px] font-bold tracking-tight text-ink sm:text-[40px]">
          Welcome to Edova
        </h1>
        <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-relaxed text-text-secondary">
          The intelligent LMS powered by an AI co-teacher. Please select your role to continue to the login page.
        </p>
      </div>

      <div className="grid w-full max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-3">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => navigate(`/login?role=${role.id}`)}
            className="group flex flex-col items-center rounded-[24px] bg-white p-8 text-center transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
          >
            <div className={`mb-6 flex size-20 items-center justify-center rounded-full ${role.color} transition-transform group-hover:scale-110`}>
              {role.icon}
            </div>
            <h2 className="font-display text-[22px] font-bold text-ink">
              {role.title}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
              {role.description}
            </p>
            <div className="mt-6 flex h-10 w-full items-center justify-center rounded-[10px] bg-sidebar text-[14px] font-semibold text-sidebar-text opacity-0 transition-opacity group-hover:opacity-100">
              Continue as {role.title} →
            </div>
          </button>
        ))}
      </div>
      

    </div>
  )
}
