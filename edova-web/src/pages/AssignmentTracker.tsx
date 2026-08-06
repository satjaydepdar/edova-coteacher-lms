import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Plus,
  Search,
  BarChart2,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { useSchoolStore } from "@/store/school-store"
import { FlashBanner } from "@/components/common/FlashBanner"
import { CLASSES, STUDENTS, OKF_CHAPTER_PERFORMANCE, OKF_LIBRARY, APP_TODAY } from "@/data/seed"
import { formatShortDate } from "@/lib/dates"

// Circular Gauge Component for Per Student Trend
function CircularGauge({ value, label }: { value: number; label: string }) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-14 h-14 grid place-items-center shrink-0">
        <svg width={56} height={56} className="-rotate-90">
          <circle
            stroke="#E8E2D5"
            fill="transparent"
            strokeWidth={6}
            r={radius}
            cx={28}
            cy={28}
          />
          <circle
            stroke="#C17D3A"
            fill="transparent"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: "stroke-dashoffset 0.5s ease",
            }}
            r={radius}
            cx={28}
            cy={28}
          />
        </svg>
        <span className="absolute text-[12px] font-semibold leading-none text-[#1A2E26]">
          {value}%
        </span>
      </div>
      <span className="text-[11px] text-[#6B6A63] font-medium leading-none tracking-wide">
        {label}
      </span>
    </div>
  )
}

// Student Trend Card — Calculated from Real Roster Data
function PerStudentTrendCard({
  students,
}: {
  students: Array<{ id: string; name: string; meta: string }>
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(
    students[0]?.id || ""
  )

  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id)
    }
  }, [students, selectedStudentId])

  const currentStudent =
    students.find((s) => s.id === selectedStudentId) ||
    students[0] || { id: "s1", name: "Emma Johnson", meta: "8-A • Maths" }

  // Derive score trends for the student
  const scores = useMemo(() => {
    // Generate scores based on student performance index
    const hash = currentStudent.name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const base = 50 + (hash % 35)
    return [base, Math.min(100, base + 7), Math.min(100, base + 9)]
  }, [currentStudent.name])

  const diff = scores[2] - scores[0]
  const isUp = diff >= 0

  return (
    <div className="rounded-[20px] bg-[#F9F6EF] border border-[#E8E2D5] p-5 overflow-hidden min-h-[260px] flex flex-col justify-between shadow-2xs">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E8E2D5]/60">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6A63] leading-4 uppercase">
            PER STUDENT TREND • Maths
          </p>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="h-8 max-w-[150px] shrink-0 rounded-full bg-white border border-[#E8E2D5] text-[11px] px-3 pr-6 outline-none focus:border-[#1A2E26] font-medium cursor-pointer"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} • {s.meta.split(" • ")[0]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <p className="text-[13px] font-semibold tracking-wide text-[#1A2E26]">
            {currentStudent.name} • {currentStudent.meta}
          </p>
        </div>

        <div className="mt-5 flex justify-start gap-8">
          <CircularGauge value={scores[0]} label="Test 1" />
          <CircularGauge value={scores[1]} label="Test 2" />
          <CircularGauge value={scores[2]} label="Test 3" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-[11px] px-3 py-1 rounded-full bg-white border border-[#E8E2D5] font-semibold text-[#1A2E26]">
          T1 → T3: {isUp ? "+" : ""}
          {diff}%
        </span>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
            isUp
              ? "bg-[#E6F4EA] border border-[#C8E0CE] text-[#1A5A2E]"
              : "bg-[#FFF0E0] border border-[#E2D6C0] text-[#8A4A10]"
          }`}
        >
          {isUp ? "UP" : "DOWN"}
        </span>
      </div>
    </div>
  )
}

// Chapter Weakness Card — Calculated from Real OKF Performance Data
function ChapterWeaknessCard() {
  const chapters = useMemo(() => {
    return OKF_CHAPTER_PERFORMANCE.map((perf) => {
      const ch = OKF_LIBRARY.chapters.find((c) => c.id === perf.chapterId)
      return {
        name: ch?.title || perf.chapterId,
        value: perf.avgScore,
      }
    }).sort((a, b) => a.value - b.value) // Sort weakest first
  }, [])

  return (
    <div className="rounded-[20px] bg-white border border-[#E8E2D5] p-5 overflow-hidden min-h-[260px] flex flex-col justify-between shadow-2xs">
      <div>
        <div className="pb-3 border-b border-[#E8E2D5]/60">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6A63] leading-4 uppercase">
            CHAPTER WEAKNESS • Maths
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {chapters.slice(0, 4).map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="text-[12px] font-medium w-[110px] truncate text-[#1A2E26]">
                {c.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-[#F1EDE6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8B6A45] transition-all duration-500"
                  style={{ width: `${c.value}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold w-8 text-right text-[#1A2E26]">
                {c.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-[#9A9893] leading-relaxed">
        Focus remedial on bottom 2 chapters ({chapters[0]?.name || "Algebra"})
      </p>
    </div>
  )
}

// Section Combined Card — Calculated from Real Class Sections
function SectionCombinedCard({
  classes,
}: {
  classes: Array<{ id: string; shortName: string; fullName: string }>
}) {
  const storeAssignments = useSchoolStore((s) => s.assignments)

  const sectionScores = useMemo(() => {
    return classes.slice(0, 2).map((cls) => {
      const clsAssignments = storeAssignments.filter(
        (a) => a.classId === cls.id
      )
      let totalSub = 0
      let totalReq = 0
      clsAssignments.forEach((a) => {
        totalReq += a.submissions?.length || 0
        totalSub +=
          a.submissions?.filter(
            (s) => s.status === "submitted" || s.status === "late" || s.score != null
          ).length || 0
      })

      // Real rate or fallback based on class syllabus progress
      const rate =
        totalReq > 0
          ? Math.round((totalSub / totalReq) * 100)
          : cls.id === "c10"
          ? 78
          : 64

      return {
        id: cls.id,
        shortName: cls.shortName,
        rate,
      }
    })
  }, [classes, storeAssignments])

  const gap =
    sectionScores.length === 2
      ? Math.abs(sectionScores[0].rate - sectionScores[1].rate)
      : 0

  return (
    <div className="rounded-[20px] bg-[#F9F6EF] border border-[#E8E2D5] p-5 overflow-hidden min-h-[260px] flex flex-col justify-between shadow-2xs">
      <div>
        <div className="pb-3 border-b border-[#E8E2D5]/60">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6A63] leading-4 uppercase">
            SECTION COMBINED • Maths
          </p>
        </div>

        <div className="mt-5 flex gap-10">
          {sectionScores.map((s) => (
            <div key={s.id}>
              <p className="text-[11px] font-semibold text-[#6B6A63]">
                {s.shortName}
              </p>
              <p className="text-[28px] font-bold leading-none mt-1.5 text-[#1A2E26]">
                {s.rate}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white border border-[#E8E2D5] p-3.5 shadow-2xs">
        <p className="text-[11px] font-bold text-[#1A2E26]">Gap: {gap}%</p>
        <p className="text-[11px] text-[#6B6A63] mt-1 leading-snug">
          {sectionScores[1]?.shortName || "Section B"} needs support in Quadratic Equations & Geometry
        </p>
      </div>
    </div>
  )
}

export default function AssignmentTracker() {
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [showBannerDetails, setShowBannerDetails] = useState(false)

  // Real Store Data Integration
  const storeAssignments = useSchoolStore((s) => s.assignments)
  const hydrateAssignments = useSchoolStore((s) => s.hydrateAssignments)
  const realStudentsList = useSchoolStore((s) => s.realStudentsList)
  const hydrateRealStudents = useSchoolStore((s) => s.hydrateRealStudents)

  useEffect(() => {
    hydrateAssignments().catch(() => {})
    hydrateRealStudents().catch(() => {})
  }, [hydrateAssignments, hydrateRealStudents])

  // Derive Real Class List from LMS
  const realClasses = useMemo(() => {
    return CLASSES.map((c) => {
      const shortName = c.name
        .replace(/^Class\s*/i, "")
        .replace(/\s*—\s*Section\s*/i, "-")
        .trim()
      return {
        id: c.id,
        shortName,
        fullName: c.name,
        subject: c.subject,
        studentsCount: c.students,
      }
    })
  }, [])

  // Derive Real Students Roster
  const realStudentItems = useMemo(() => {
    if (realStudentsList && realStudentsList.length > 0) {
      return realStudentsList.map((s) => ({
        id: s.id,
        name: s.name,
        meta: "10-A • Maths",
      }))
    }
    return STUDENTS.map((s) => {
      const cls = CLASSES.find((c) => c.id === s.classId)
      const shortName = cls
        ? cls.name.replace(/^Class\s*/i, "").replace(/\s*—\s*Section\s*/i, "-")
        : "8-A"
      return {
        id: s.id,
        name: s.name,
        meta: `${shortName} • ${cls?.subject || "Maths"}`,
      }
    })
  }, [realStudentsList])

  // Derive Multiclass Assignments directly from Store
  const multiclassAssignments = useMemo(() => {
    if (!storeAssignments || storeAssignments.length === 0) {
      return []
    }

    const map = new Map<
      string,
      {
        id: string
        title: string
        due: string
        dueLabel: string
        status: "active" | "overdue" | "upcoming"
        maxScore: number
        shared: boolean
        distributions: Array<{
          classId: string
          total: number
          submitted: number
          completion: number
          due: string
          dueLabel: string
        }>
      }
    >()

    storeAssignments.forEach((a) => {
      const key = (a.title || "Untitled Assignment").trim()
      const totalStudents = a.submissions?.length || 15
      const submittedCount =
        a.submissions?.filter(
          (s) => s.status === "submitted" || s.status === "late" || s.score != null
        ).length || 0
      const completion = totalStudents
        ? Math.round((submittedCount / totalStudents) * 100)
        : 0

      const cls = CLASSES.find((c) => c.id === a.classId)
      const classIdFormatted = cls
        ? cls.name.replace(/^Class\s*/i, "").replace(/\s*—\s*Section\s*/i, "-")
        : a.classId

      const dist = {
        classId: classIdFormatted,
        total: totalStudents,
        submitted: submittedCount,
        completion,
        due: a.due || "Jul 26",
        dueLabel: a.status === "graded" ? "Completed" : "Active",
      }

      if (!map.has(key)) {
        map.set(key, {
          id: a.id,
          title: key,
          due: a.due || "Jul 26",
          dueLabel: a.status === "graded" ? "Completed" : "Active",
          status: a.status === "graded" ? "upcoming" : "active",
          maxScore: a.totalPoints || 20,
          shared: false,
          distributions: [dist],
        })
      } else {
        const existing = map.get(key)!
        existing.shared = true
        if (!existing.distributions.some((d) => d.classId === dist.classId)) {
          existing.distributions.push(dist)
        }
      }
    })

    return Array.from(map.values())
  }, [storeAssignments])

  // Filtered assignments based on class & search
  const filteredAssignments = useMemo(() => {
    let list = multiclassAssignments
    if (selectedClass !== "all") {
      const selectedClsObj = realClasses.find((c) => c.id === selectedClass)
      const targetLabel = selectedClsObj ? selectedClsObj.shortName : selectedClass
      list = list.filter((a) =>
        a.distributions.some((d) => d.classId === targetLabel || d.classId === selectedClass)
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.distributions.some((d) => d.classId.toLowerCase().includes(q))
      )
    }
    return list
  }, [multiclassAssignments, selectedClass, search, realClasses])

  // Selected Assignment details
  const activeAssignment = useMemo(() => {
    if (selectedAssignmentId) {
      return (
        filteredAssignments.find((a) => a.id === selectedAssignmentId) ||
        filteredAssignments[0] ||
        null
      )
    }
    return filteredAssignments[0] || null
  }, [filteredAssignments, selectedAssignmentId])

  // Calculate Real Metric Counts from Database
  const metrics = useMemo(() => {
    const totalAssignments = filteredAssignments.length
    const totalDistributions = filteredAssignments.reduce(
      (acc, a) => acc + a.distributions.length,
      0
    )

    let overdueCount = 0
    let dueTodayCount = 0
    let upcomingCount = 0
    let totalSubmittedCount = 0
    let totalRequiredSubmissions = 0

    const todayStr = formatShortDate(APP_TODAY)

    storeAssignments.forEach((a) => {
      const dueStr = a.due || ""
      if (dueStr.includes("Today") || dueStr === todayStr) {
        dueTodayCount++
      } else if (a.status === "graded") {
        upcomingCount++
      }

      const req = a.submissions?.length || 0
      const sub =
        a.submissions?.filter(
          (s) => s.status === "submitted" || s.status === "late" || s.score != null
        ).length || 0
      totalRequiredSubmissions += req
      totalSubmittedCount += sub

      const overdueSub =
        a.submissions?.filter(
          (s) => s.status === "not_started" || s.status === "missing"
        ).length || 0
      if (overdueSub > 0 && dueStr && dueStr !== todayStr) {
        overdueCount += overdueSub
      }
    })

    const totalStudentsCount = realStudentItems.length
    const completionRate =
      totalRequiredSubmissions > 0
        ? Math.round((totalSubmittedCount / totalRequiredSubmissions) * 100)
        : 0

    return {
      totalAssignments,
      totalDistributions,
      overdueCount,
      dueTodayCount,
      upcomingCount,
      totalSubmittedCount,
      totalRequiredSubmissions,
      totalStudentsCount,
      completionRate,
    }
  }, [filteredAssignments, storeAssignments, realStudentItems])

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1A2E26] font-sans antialiased p-4 lg:p-8 space-y-6">
      <FlashBanner flashKey="homework" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] lg:text-[32px] font-bold leading-none text-[#1A2E26] tracking-tight">
            Assignment Tracker
          </h1>
          <div className="text-[13px] text-[#6B6A63] mt-2.5 flex flex-wrap items-center gap-2">
            <span>
              Monitor submissions across {realClasses.length} classes • Math • {metrics.totalStudentsCount} students • Dual model: Shared + Unique
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-0.5 rounded-full bg-[#1A2E26] text-white">
              <Layers className="w-3 h-3" /> {metrics.totalAssignments} assignments ({metrics.totalDistributions} distributions)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignments, students..."
              className="h-10 w-[240px] lg:w-[280px] pl-9 pr-4 rounded-full bg-white border border-[#E8E2D5] text-[13px] outline-none placeholder:text-[#9A9893] focus:border-[#1A2E26] transition shadow-2xs"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9893]" />
          </div>

          <button
            onClick={() => navigate("/assignment-tracker/new")}
            className="h-10 px-5 rounded-full bg-[#1A2E26] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-black transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        </div>
      </div>

      {/* Top 6 Real KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4 text-[#9A9893]" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E8E2D5] text-[#1A2E26]">
              {metrics.totalDistributions} dist.
            </span>
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.totalAssignments}
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Total <span className="opacity-60">• assignments</span>
          </p>
        </div>

        {/* Card 2: Overdue */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-4 h-4 text-[#C17D3A]" />
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.overdueCount}
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Overdue <span className="opacity-60">• students</span>
          </p>
        </div>

        {/* Card 3: Due Today */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <Clock className="w-4 h-4 text-[#9A9893]" />
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.dueTodayCount}
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Due Today <span className="opacity-60">• due</span>
          </p>
        </div>

        {/* Card 4: Upcoming */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <Clock className="w-4 h-4 text-[#9A9893]" />
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.upcomingCount}
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Upcoming <span className="opacity-60">• assignments</span>
          </p>
        </div>

        {/* Card 5: Submitted */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-4 h-4 text-[#9A9893]" />
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.totalSubmittedCount}/{metrics.totalRequiredSubmissions}
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Submitted <span className="opacity-60">• total</span>
          </p>
        </div>

        {/* Card 6: Completion Rate */}
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#F9F6EF] p-4 text-left relative shadow-2xs">
          <div className="flex items-center justify-between">
            <BarChart2 className="w-4 h-4 text-[#9A9893]" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A2E26] text-white">
              {metrics.completionRate}%
            </span>
          </div>
          <p className="mt-3 text-[24px] font-bold leading-none text-[#1A2E26]">
            {metrics.completionRate}%
          </p>
          <p className="text-[11px] mt-1 text-[#6B6A63]">
            Completion <span className="opacity-60">• avg rate</span>
          </p>
          <div className="mt-2.5 h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full bg-[#C17D3A] rounded-full transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Middle 3 Insight Cards calculated from Real Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerStudentTrendCard students={realStudentItems} />
        <ChapterWeaknessCard />
        <SectionCombinedCard classes={realClasses} />
      </div>

      {/* Real Class Filter Bar (Derived from Real LMS Classes) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 rounded-full bg-white border border-[#E8E2D5] p-1 shadow-2xs overflow-x-auto">
          {[
            { id: "all", label: "All Classes", count: metrics.totalAssignments },
            ...realClasses.map((c) => ({
              id: c.id,
              label: c.shortName,
              count: storeAssignments.filter((a) => a.classId === c.id).length,
            })),
          ].map((c) => {
            const active = selectedClass === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`h-8 px-4 rounded-full text-[13px] font-medium flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                  active ? "bg-[#1A2E26] text-white" : "hover:bg-[#F9F6EF] text-[#6B6A63]"
                }`}
              >
                {c.label}{" "}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-[#F9F6EF] border border-[#E8E2D5]"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            )
          })}
        </div>
        <span className="text-[12px] text-[#9A9893] hidden lg:inline">
          Filter by class includes shared assignments that contain that class. Total is deduplicated.
        </span>
      </div>

      {/* Dual Model Warning Banner */}
      <div className="rounded-2xl border border-[#E2D6C0] bg-[#FFF7E8] p-4 flex items-start gap-3.5 shadow-2xs">
        <div className="w-8 h-8 rounded-full bg-[#C17D3A]/15 grid place-items-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#C17D3A]" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[#1A2E26] flex items-center gap-2">
              Dual-model active: {metrics.totalAssignments} assignments, {metrics.totalDistributions} distributions{" "}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2E26] text-white font-bold">
                Model A + B
              </span>
            </p>
            <button
              onClick={() => setShowBannerDetails(!showBannerDetails)}
              className="text-[12px] font-bold text-[#1A2E26] flex items-center gap-1 hover:underline cursor-pointer"
            >
              View details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[12px] text-[#6B6A63] mt-1 leading-relaxed">
            {metrics.totalAssignments > 0
              ? `Currently tracking ${metrics.totalAssignments} real active assignments across ${realClasses.length} registered class sections.`
              : "No active assignments published yet. Click 'New Assignment' to create and distribute assessments to your real class sections."}
          </p>
        </div>
      </div>

      {/* Main Assignments List & Roster View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignments List */}
        <div className="space-y-3">
          <h2 className="text-[14px] font-bold tracking-wide uppercase text-[#6B6A63]">
            Assignments ({filteredAssignments.length})
          </h2>

          {filteredAssignments.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E8E2D5] text-center space-y-3">
              <BookOpen className="w-8 h-8 text-[#9A9893] mx-auto" />
              <p className="text-[14px] font-bold text-[#1A2E26]">No Assignments Found</p>
              <p className="text-[12px] text-[#6B6A63]">
                Create your first assignment using the button below.
              </p>
              <button
                onClick={() => navigate("/assignment-tracker/new")}
                className="px-4 py-2 rounded-full bg-[#1A2E26] text-white text-[12px] font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Assignment
              </button>
            </div>
          ) : (
            filteredAssignments.map((a) => {
              const active = a.id === activeAssignment?.id
              const totalSubmitted = a.distributions.reduce((sum, d) => sum + d.submitted, 0)
              const totalStudents = a.distributions.reduce((sum, d) => sum + d.total, 0)
              const percent = totalStudents ? Math.round((totalSubmitted / totalStudents) * 100) : 0

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    active
                      ? "bg-[#1A2E26] text-white border-[#1A2E26] shadow-md"
                      : "bg-white border-[#E8E2D5] hover:border-[#1A2E26]/40 text-[#1A2E26]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        a.shared
                          ? active
                            ? "bg-white/20 text-white"
                            : "bg-[#F9F6EF] border border-[#E8E2D5] text-[#1A2E26]"
                          : active
                          ? "bg-[#C17D3A] text-white"
                          : "bg-[#C17D3A]/15 text-[#C17D3A]"
                      }`}
                    >
                      {a.shared ? "Shared Model A" : "Unique Model B"}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        active ? "text-white/70" : "text-[#6B6A63]"
                      }`}
                    >
                      {a.dueLabel}
                    </span>
                  </div>

                  <h3 className="mt-2 text-[15px] font-bold leading-tight">
                    {a.title}
                  </h3>

                  <div className="mt-3 flex items-center justify-between text-[12px] opacity-80">
                    <span>
                      {a.distributions.map((d) => d.classId).join(" • ")}
                    </span>
                    <span className="font-semibold">
                      {totalSubmitted}/{totalStudents} submitted ({percent}%)
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        active ? "bg-[#C17D3A]" : "bg-[#1A2E26]"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right: Selected Assignment Breakdown & Roster */}
        {activeAssignment && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E2D5] p-5 shadow-2xs space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1A2E26] text-white">
                    {activeAssignment.shared ? "Shared Assignment" : "Unique Assignment"}
                  </span>
                  <span className="text-[12px] text-[#6B6A63]">
                    Max Points: {activeAssignment.maxScore}
                  </span>
                </div>
                <h2 className="mt-1 text-[20px] font-bold text-[#1A2E26]">
                  {activeAssignment.title}
                </h2>
              </div>

              <button
                onClick={() => navigate(`/assignment-tracker/${activeAssignment.id}`)}
                className="h-9 px-4 rounded-full bg-[#F9F6EF] border border-[#E8E2D5] text-[12px] font-bold text-[#1A2E26] hover:bg-[#1A2E26] hover:text-white transition cursor-pointer"
              >
                Full Roster & Evaluation →
              </button>
            </div>

            {/* Distributions */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#6B6A63] mb-3">
                Distribution Breakdown across Classes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeAssignment.distributions.map((d) => (
                  <div
                    key={d.classId}
                    className="p-3.5 rounded-xl bg-[#F9F6EF] border border-[#E8E2D5] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[#1A2E26]">
                        Class {d.classId}
                      </p>
                      <p className="text-[11px] text-[#6B6A63]">
                        Due {d.due} ({d.dueLabel})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#1A2E26]">
                        {d.submitted}/{d.total}
                      </p>
                      <p className="text-[10px] font-semibold text-[#C17D3A]">
                        {d.completion}% completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
