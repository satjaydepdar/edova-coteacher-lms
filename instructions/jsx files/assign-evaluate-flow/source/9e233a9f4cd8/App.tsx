import React, { useState, useRef } from "react";
import {
  FileText,
  PenLine,
  ListChecks,
  Video,
  Code2,
  Sparkles,
  X,
  Upload,
  Calendar as CalIcon,
  Clock,
  Trash2,
  Check,
  Search,
  MoreHorizontal,
  Image as ImageIcon,
  HardDrive,
  Layers,
  Move,
  PenTool,
  Type,
  CheckCircle2,
  XCircle,
  Star,
  Undo2,
  ZoomIn,
  ArrowLeft,
  Paperclip,
  ChevronDown,
  Plus,
  File,
} from "lucide-react";

type Step = "type" | "create1" | "create2" | "dashboard" | "evaluate";

const assignmentTypes = [
  {
    id: "written",
    title: "Written",
    desc: "Students submit handwritten work or typed documents as images or PDFs",
    icon: FileText,
  },
  {
    id: "pdf",
    title: "PDF Annotation",
    desc: "Students annotate directly on the PDF you provide",
    icon: PenLine,
  },
  {
    id: "mcq",
    title: "Online MCQ",
    desc: "Auto-graded quizzes with multiple choice, true/false and more",
    icon: ListChecks,
  },
  {
    id: "media",
    title: "Multimedia",
    desc: "Video, audio or presentation submissions for creative tasks",
    icon: Video,
  },
  {
    id: "coding",
    title: "Coding",
    desc: "In-browser code editor with test cases and auto evaluation",
    icon: Code2,
  },
];

const classesList = ["Class 6 - A", "Class 6 - B", "Class 7 - A"];
const subjects = ["Science", "Mathematics", "English", "History"];

export default function App() {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState("written");
  const [title, setTitle] = useState("Plants and their needs");
  const [description, setDescription] = useState(
    "Explain how different plants adapt to their environment. Include examples with diagrams."
  );
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState("Upload");
  const [selectedClasses, setSelectedClasses] = useState(["Class 6 - A", "Class 6 - B"]);
  const [subject, setSubject] = useState("Science");
  const [marks, setMarks] = useState("50");
  const [schedule, setSchedule] = useState(false);
  const [endDate, setEndDate] = useState("18 Feb 2026, 11:30 AM");
  const [showCalendar, setShowCalendar] = useState(false);
  const [evalTab, setEvalTab] = useState<"evaluate" | "submit">("evaluate");
  const [annotateMode, setAnnotateMode] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [givenMarks, setGivenMarks] = useState("40");
  const [feedback, setFeedback] = useState("Very Good, keep drawing more diagrams");
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [interactionTick, setInteractionTick] = useState(0);
  const sharedAudioRef = useRef<AudioContext | null>(null);

  const handleAttach = () => {
    setAttachments([{ name: "Plants Providers Worksheet.pdf", size: "342.33KB" }]);
    setShowUpload(false);
  };

  const bumpInteraction = () => setInteractionTick((t) => t + 1);

  const triggerMediaProbe = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!sharedAudioRef.current) {
        sharedAudioRef.current = new Ctx();
      }
      const ctx = sharedAudioRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + 0.02);
    } catch {}
  };

  const selectedTypeObj = assignmentTypes.find((t) => t.id === selectedType) || assignmentTypes[0];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#111827] font-[Inter,system-ui,sans-serif] antialiased selection:bg-[#EEF2FF]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{font-family:Inter,system-ui,sans-serif}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:999px}
      `}</style>

      {/* TOP NAV FOR FLOW */}
      {step !== "evaluate" && (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[#E5E7EB]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== "type" && (
                <button
                  onClick={() => setStep(step === "dashboard" ? "create2" : step === "create2" ? "create1" : "type")}
                  className="w-8 h-8 rounded-full border border-[#E5E7EB] grid place-items-center hover:bg-[#F8F9FB] transition"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-[#4F46E5] grid place-items-center text-white font-bold text-[13px]">e</div>
                <span className="font-semibold text-[15px] tracking-tight">Edova</span>
                <span className="hidden md:inline text-[#E5E7EB] mx-1">/</span>
                <span className="hidden md:inline text-[13px] text-[#6B7280]">Assignments</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step === "type" && (
                <div className="hidden md:flex items-center gap-1.5 text-[12px] text-[#6B7280] bg-[#F8F9FB] border border-[#E5E7EB] rounded-full px-3 h-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" /> Step 1 of 4
                </div>
              )}
              {step === "create1" || step === "create2" ? (
                <>
                  <button
                    onClick={() => setStep("type")}
                    className="h-9 px-4 rounded-full text-[13px] font-medium text-[#6B7280] hover:text-[#111827]"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => setStep(step === "create1" ? "create2" : "dashboard")}
                    className="h-9 px-5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold shadow-sm transition"
                  >
                    {step === "create1" ? "Next" : "Publish"}
                  </button>
                </>
              ) : step === "dashboard" ? (
                <button
                  onClick={() => setStep("evaluate")}
                  className="h-9 px-4 rounded-full bg-[#111827] text-white text-[13px] font-medium"
                >
                  Go to Evaluation
                </button>
              ) : null}
            </div>
          </div>
        </header>
      )}

      {/* STEP 1: TYPE SELECT */}
      {step === "type" && (
        <main className="max-w-[960px] mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="mb-8">
            <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight leading-tight">What type of assignment?</h1>
            <p className="text-[14px] text-[#6B7280] mt-2">Choose how you want students to submit their work</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assignmentTypes.map((t) => {
              const Icon = t.icon;
              const active = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  data-testid={`type-${t.id}`}
                  data-selected={active ? "true" : "false"}
                  onClick={() => {
                    setSelectedType(t.id);
                    bumpInteraction();
                    if (t.id === "media") triggerMediaProbe();
                  }}
                  className={`text-left p-5 rounded-[16px] border bg-white transition-all shadow-sm hover:shadow
                    ${active ? "border-[#4F46E5] bg-[#EEF2FF] ring-1 ring-[#4F46E5]/20" : "border-[#E5E7EB]"}
                  `}
                >
                  <div className={`w-10 h-10 rounded-[12px] grid place-items-center mb-4 ${active ? "bg-[#4F46E5] text-white" : "bg-[#F8F9FB] text-[#6B7280] border border-[#E5E7EB]"}`}>
                    <Icon size={18} />
                  </div>
                  <div className="font-semibold text-[14px]">{t.title}</div>
                  <div className="text-[12.5px] leading-[1.5] text-[#6B7280] mt-1.5 min-h-[36px]">{t.desc}</div>
                  {active ? (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-[#4F46E5] bg-white border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                      <Check size={12} /> Selected • {interactionTick > 0 ? `tap ${interactionTick}` : "ready"}
                    </div>
                  ) : (
                    <div className="mt-4 text-[11px] text-[#9CA3AF]">Tap to select</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep("create1")}
              className="h-11 px-7 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[14px] font-semibold shadow-sm transition"
            >
              Continue with {selectedTypeObj.title}
            </button>
          </div>
        </main>
      )}

      {/* STEP 2: CREATE ASSIGNMENT 1 */}
      {step === "create1" && (
        <main className="max-w-[760px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="p-5 md:p-7 border-b border-[#E5E7EB] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="appearance-none h-9 pl-3 pr-8 rounded-full border border-[#E5E7EB] bg-[#F8F9FB] text-[13px] font-medium"
                  >
                    {assignmentTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} Assignment
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] text-[12px] font-semibold">
                <Sparkles size={14} /> Create With AI
              </button>
            </div>

            <div className="p-5 md:p-7 space-y-6">
              <div>
                <label className="text-[13px] font-medium">Assignment Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full h-11 px-3.5 rounded-[12px] border border-[#E5E7EB] bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  placeholder="e.g. Plants and their needs"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full px-3.5 py-3 rounded-[12px] border border-[#E5E7EB] bg-white text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] resize-none"
                  placeholder="Add instructions..."
                />
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex h-7 w-7 rounded-full bg-[#F8F9FB] border border-[#E5E7EB] grid place-items-center text-[#6B7280]">
                    <Type size={14} />
                  </span>
                  <span className="inline-flex h-7 w-7 rounded-full bg-[#F8F9FB] border border-[#E5E7EB] grid place-items-center text-[#6B7280]">
                    <PenTool size={14} />
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium">Attachments</label>
                <div className="mt-2">
                  {attachments.length === 0 ? (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="w-full h-[88px] rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#FCFCFD] hover:bg-[#F8F9FB] grid place-items-center gap-1 transition"
                    >
                      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#4F46E5]">
                        <Paperclip size={16} /> Upload Attachment
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">PDF, DOCX, Images up to 25MB</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((a) => (
                        <span key={a.name} className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[12.5px] font-medium text-[#3730A3]">
                          <File size={14} /> {a.name}
                          <button onClick={() => setAttachments([])} className="ml-1 w-5 h-5 rounded-full bg-white grid place-items-center">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setShowUpload(true)}
                        className="h-9 px-3 rounded-full border border-[#E5E7EB] bg-white text-[12.5px] font-medium inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Add more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 md:px-7 py-4 bg-[#F8F9FB] border-t border-[#E5E7EB] flex justify-between items-center">
              <span className="text-[12px] text-[#9CA3AF]">Auto-saved • Draft</span>
              <span className="text-[12px] text-[#6B7280]">Step 1 of 2 • Details</span>
            </div>
          </div>
        </main>
      )}

      {/* STEP 3: CONFIG */}
      {step === "create2" && (
        <main className="max-w-[760px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="p-5 md:p-7 space-y-7">
              <div>
                <label className="text-[13px] font-medium">Choose Classes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedClasses.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[12.5px] font-medium">
                      {c}
                      <button
                        onClick={() => setSelectedClasses((s) => s.filter((x) => x !== c))}
                        className="w-5 h-5 rounded-full bg-white grid place-items-center border border-[#E5E7EB]"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedClasses.includes(e.target.value)) setSelectedClasses([...selectedClasses, e.target.value]);
                      }}
                      defaultValue=""
                      className="h-8 pl-3 pr-7 rounded-full border border-[#E5E7EB] bg-white text-[12.5px]"
                    >
                      <option value="" disabled>
                        + Add class
                      </option>
                      {classesList.filter((c) => !selectedClasses.includes(c)).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] font-medium">Choose Subject</label>
                  <div className="relative mt-2">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-9 rounded-[12px] border border-[#E5E7EB] bg-white text-[14px] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                    >
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-medium">End Date & Time</label>
                  <div className="relative mt-2">
                    <button
                      onClick={() => setShowCalendar((v) => !v)}
                      className="w-full h-11 px-3.5 rounded-[12px] border border-[#E5E7EB] bg-white text-left text-[13.5px] flex items-center justify-between"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalIcon size={16} className="text-[#6B7280]" /> {endDate}
                      </span>
                      <Clock size={16} className="text-[#9CA3AF]" />
                    </button>

                    {showCalendar && (
                      <div className="absolute z-20 mt-2 w-[300px] right-0 bg-white rounded-[16px] border border-[#E5E7EB] shadow-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-[13px]">February 2026</div>
                          <div className="flex gap-1">
                            <button className="w-7 h-7 rounded-full hover:bg-[#F8F9FB] grid place-items-center border border-[#E5E7EB]">‹</button>
                            <button className="w-7 h-7 rounded-full hover:bg-[#F8F9FB] grid place-items-center border border-[#E5E7EB]">›</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[11px] text-[#9CA3AF] text-center mb-1">
                          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d)=> <div key={d} className="h-7 grid place-items-center">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({length:28}).map((_,i)=>{
                            const day = i+1;
                            const selected = day===18;
                            return (
                              <button
                                key={i}
                                onClick={()=>{ setEndDate(`18 Feb 2026, 11:30 AM`); setShowCalendar(false)}}
                                className={`h-8 rounded-full text-[12px] grid place-items-center transition ${selected ? "bg-[#4F46E5] text-white font-semibold" : "hover:bg-[#F8F9FB] text-[#111827]"}`}
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-3 flex justify-between">
                          <button onClick={()=>setShowCalendar(false)} className="text-[12px] font-medium px-3 h-7 rounded-full border border-[#E5E7EB]">Clear</button>
                          <button onClick={()=>setShowCalendar(false)} className="text-[12px] font-semibold px-3 h-7 rounded-full bg-[#4F46E5] text-white">Today</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[13px] font-medium">Total Marks</label>
                  <input
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="mt-2 w-full h-11 px-3.5 rounded-[12px] border border-[#E5E7EB] bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                </div>
                <div className="flex items-end justify-between border border-[#E5E7EB] rounded-[12px] h-11 px-3.5 bg-[#F8F9FB]">
                  <div>
                    <div className="text-[11px] text-[#6B7280]">Schedule for later</div>
                    <div className="text-[12.5px] font-medium -mt-0.5">{schedule ? "Enabled" : "Publish now"}</div>
                  </div>
                  <button
                    onClick={() => setSchedule(!schedule)}
                    className={`relative w-10 h-6 rounded-full transition ${schedule ? "bg-[#4F46E5]" : "bg-[#E5E7EB]"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition ${schedule ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 md:px-7 py-4 bg-[#F8F9FB] border-t border-[#E5E7EB] flex justify-between">
              <span className="text-[12px] text-[#6B7280]">Step 2 of 2 • Configuration</span>
              <span className="text-[12px] text-[#9CA3AF]">You can edit after publishing</span>
            </div>
          </div>
        </main>
      )}

      {/* DASHBOARD */}
      {step === "dashboard" && (
        <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] font-semibold text-[#065F46]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> Ongoing - ends in 15 Hours 5 Minutes
              </span>
              <span className="hidden md:inline-flex text-[12px] text-[#9CA3AF]">ID A1472 • Created 2 hours ago</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-full border border-[#E5E7EB] bg-white text-[12.5px]">Share</button>
              <button className="h-8 w-8 rounded-full border border-[#E5E7EB] grid place-items-center">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-6">
              <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-6 md:p-7">
                <h2 className="text-[20px] font-semibold leading-tight">{title}</h2>
                <p className="text-[13.5px] text-[#4B5563] leading-relaxed mt-3">{description}</p>

                <div className="mt-5 flex items-center gap-3">
                  <img src="https://i.pravatar.cc/100?img=12" alt="" className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-[12px] text-[#6B7280]">Created by</div>
                    <div className="text-[13px] font-medium -mt-0.5">Dave Walker • Science Dept.</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Attachments</div>
                  <div className="mt-2 inline-flex items-center gap-2 h-10 px-3 rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] text-[13px]">
                    <div className="w-8 h-8 rounded-[8px] bg-[#EEF2FF] border border-[#C7D2FE] grid place-items-center text-[#4F46E5]">
                      <File size={16} />
                    </div>
                    Plants Providers Worksheet.pdf <span className="text-[#9CA3AF] text-[11px]">342KB</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[14px]">Ongoing Assignments</h3>
                  <button className="text-[12px] font-medium text-[#4F46E5]">View all</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "A1472", title, ends: "Ends in 15h 5m", cls: "Class 6 - A" },
                    { id: "A1470", title: "Water Cycle Diagram", ends: "Ends in 2 days", cls: "Class 6 - B" },
                  ].map((a) => (
                    <div key={a.id} className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[16px] p-4">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#BBF7D0]">ID {a.id}</span>
                        <span className="text-[11px] text-[#065F46] font-medium">{a.ends}</span>
                      </div>
                      <div className="mt-3 font-medium text-[14px] leading-tight">{a.title}</div>
                      <div className="text-[12px] text-[#6B7280] mt-1">{a.cls} • 50 Marks</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-5">
                <h3 className="font-semibold text-[14px] mb-4">Overall Statistics</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "Given", v: 418, sub: "students" },
                    { k: "Submissions", v: 283, sub: "67% submitted" },
                    { k: "Returned", v: 61, sub: "evaluated" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-[14px] bg-[#F8F9FB] border border-[#E5E7EB] p-4">
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-[#6B7280]">{s.k}</div>
                      <div className="text-[22px] font-semibold mt-1">{s.v}</div>
                      <div className="text-[11px] text-[#9CA3AF] mt-0.5">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5">
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-[12px] bg-[#F8F9FB] border border-[#E5E7EB] p-3.5">
                    <div className="text-[11px] text-[#6B7280] uppercase font-semibold">Total Marks</div>
                    <div className="text-[18px] font-semibold mt-1">50</div>
                  </div>
                  <div className="rounded-[12px] bg-[#F8F9FB] border border-[#E5E7EB] p-3.5">
                    <div className="text-[11px] text-[#6B7280] uppercase font-semibold">Type</div>
                    <div className="mt-1 inline-flex px-2.5 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[12px] font-medium text-[#3730A3]">{selectedTypeObj.title}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-[#6B7280] mb-2">Classes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClasses.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-white border border-[#E5E7EB] text-[12px]">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-[12px] border border-[#E5E7EB] p-3 flex items-center justify-between">
                  <div className="text-[12px]"><span className="text-[#6B7280]">Due:</span> <span className="font-medium">18 Feb, 11:30 AM</span></div>
                  <span className="text-[11px] font-medium text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">On track</span>
                </div>
                <button
                  onClick={() => setStep("evaluate")}
                  className="mt-4 w-full h-10 rounded-full bg-[#111827] text-white text-[13px] font-medium"
                >
                  Evaluate Submissions
                </button>
              </div>

              <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-5">
                <h4 className="font-semibold text-[13px] mb-3">Completed</h4>
                <div className="space-y-2.5">
                  {[
                    { t: "Photosynthesis Notes", d: "Returned to 42 students" },
                    { t: "Seed Germination Lab", d: "Returned to 38 students" },
                  ].map((r) => (
                    <div key={r.t} className="flex gap-3 p-2.5 rounded-[12px] hover:bg-[#F8F9FB] border border-transparent hover:border-[#E5E7EB] transition">
                      <div className="w-8 h-8 rounded-[8px] bg-[#F3F4F6] grid place-items-center">
                        <CheckCircle2 size={16} className="text-[#6B7280]" />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium leading-tight">{r.t}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5">{r.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* EVALUATION */}
      {step === "evaluate" && (
        <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
          {/* eval header */}
          <div className="h-[56px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-3 md:px-5 shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => setStep("dashboard")} className="w-8 h-8 rounded-full border border-[#E5E7EB] grid place-items-center">
                <ArrowLeft size={16} />
              </button>
              <div className="text-[13px] md:text-[14px] font-semibold truncate max-w-[160px] md:max-w-none">{title}</div>
              <span className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3] font-medium">Written</span>
            </div>
            <div className="flex items-center gap-2">
              {annotateMode ? (
                <>
                  <button onClick={() => setAnnotateMode(false)} className="h-8 px-3 rounded-full border border-[#E5E7EB] text-[12.5px] font-medium bg-white">
                    Discard
                  </button>
                  <button
                    onClick={() => { setSaved(true); setTimeout(()=>setSaved(false),1500); }}
                    className="h-8 px-4 rounded-full bg-[#4F46E5] text-white text-[12.5px] font-semibold"
                  >
                    {saved ? "Saved" : "Save"}
                  </button>
                </>
              ) : (
                <button onClick={() => setAnnotateMode(true)} className="h-8 px-4 rounded-full bg-[#111827] text-white text-[12.5px] font-medium">
                  Evaluate
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-0">
            {/* sidebar */}
            <aside className="bg-white border-r border-[#E5E7EB] flex flex-col min-h-0">
              <div className="p-3 border-b border-[#E5E7EB]">
                <div className="flex bg-[#F3F4F6] rounded-full p-1 gap-1">
                  <button
                    onClick={() => setEvalTab("evaluate")}
                    className={`flex-1 h-7 rounded-full text-[12px] font-medium transition ${evalTab === "evaluate" ? "bg-white shadow-sm border border-[#E5E7EB] text-[#111827]" : "text-[#6B7280]"}`}
                  >
                    Yet to Evaluate (1)
                  </button>
                  <button
                    onClick={() => setEvalTab("submit")}
                    className={`flex-1 h-7 rounded-full text-[12px] font-medium transition ${evalTab === "submit" ? "bg-white shadow-sm border border-[#E5E7EB]" : "text-[#6B7280]"}`}
                  >
                    Yet to Submit (25)
                  </button>
                </div>
                <div className="mt-3 relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input placeholder="Search student" className="w-full h-9 pl-8 pr-3 rounded-full border border-[#E5E7EB] bg-[#F8F9FB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20" />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 space-y-1">
                {evalTab === "evaluate" ? (
                  <div className="rounded-[12px] border border-[#4F46E5] bg-[#EEF2FF] p-3 flex gap-3">
                    <img src="https://i.pravatar.cc/100?img=32" className="w-9 h-9 rounded-full" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-tight">Aarav Sharma</div>
                      <div className="text-[11px] text-[#6B7280]">Class 6 - A • Roll 12</div>
                      <div className="mt-1.5 inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E]">Submitted 2h ago</div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mt-2" />
                  </div>
                ) : (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-[12px] border border-[#E5E7EB] bg-white p-3 flex gap-3 opacity-70">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-9 h-9 rounded-full" alt="" />
                      <div>
                        <div className="text-[13px] font-medium">Student {i + 1}</div>
                        <div className="text-[11px] text-[#9CA3AF]">Not submitted</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-[#E5E7EB] text-[11px] text-[#9CA3AF]">1 student awaiting evaluation</div>
            </aside>

            {/* viewer */}
            <div className="flex flex-col min-w-0 bg-[#F3F4F6] relative">
              {/* warning banner */}
              {!annotateMode && (
                <div className="m-3 md:m-4 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] p-3 flex items-start justify-between gap-3">
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#FEF3C7] border border-[#FDE68A] grid place-items-center text-[#92400E] shrink-0">
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className="text-[12.5px] font-medium text-[#92400E]">Evaluation pending</div>
                      <div className="text-[12px] text-[#B45309] leading-snug mt-0.5">Add marks and feedback after reviewing the submission. Annotations are saved locally.</div>
                    </div>
                  </div>
                  <button onClick={() => setAnnotateMode(true)} className="shrink-0 h-8 px-3 rounded-full bg-[#111827] text-white text-[12px] font-medium">Evaluate</button>
                </div>
              )}

              <div className="flex-1 overflow-auto p-3 md:p-6 flex justify-center items-start">
                <div className="relative bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm w-full max-w-[760px] overflow-hidden">
                  {/* toolbar */}
                  {annotateMode && (
                    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-1.5">
                      {[
                        { i: Move, a: true },
                        { i: PenTool, a: false },
                        { i: Type, a: false },
                        { i: CheckCircle2, a: true },
                        { i: XCircle, a: false },
                        { i: Star, a: true },
                        { i: Undo2, a: false },
                        { i: Trash2, a: false },
                        { i: ZoomIn, a: false },
                      ].map((t, idx) => (
                        <button
                          key={idx}
                          className={`w-8 h-8 rounded-[8px] grid place-items-center transition ${t.a ? "bg-[#111827] text-white" : "hover:bg-[#F8F9FB] text-[#6B7280]"}`}
                        >
                          <t.i size={16} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Mock worksheet image */}
                  <div className="aspect-[3/4] bg-white p-6 md:p-10 relative">
                    <div className="max-w-[560px] mx-auto">
                      <div className="text-center border-b-2 border-black pb-3">
                        <div className="text-[11px] tracking-[0.2em] font-semibold">ZYLKER SCHOOL</div>
                        <div className="text-[18px] font-bold mt-1 tracking-tight">PLANTS & THEIR NEEDS</div>
                        <div className="text-[10px] text-[#6B7280] mt-1">Class 6 • Science • Worksheet 04</div>
                      </div>

                      <div className="mt-6 space-y-5 text-[13px] leading-relaxed">
                        <div>
                          <div className="font-semibold text-[12px] uppercase tracking-wide">Q1. Label the parts of a plant</div>
                          <div className="mt-3 h-[120px] rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] grid place-items-center text-[#9CA3AF] text-[12px] relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#111827] grid place-items-center font-bold">🌱</div>
                                <div className="mt-2">hand drawn plant sketch</div>
                              </div>
                            </div>
                            {/* annotations overlay */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              <g>
                                <path d="M 30 70 L 45 85 L 75 45" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </g>
                            </svg>
                            <span className="absolute left-6 top-6 text-[12px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-1.5 py-0.5 rounded">Good</span>
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-[12px] uppercase tracking-wide">Q2. Explain photosynthesis in your own words</div>
                          <div className="mt-2 text-[13px] leading-[1.7] text-[#374151] bg-[#FFFBEB]/60 border border-[#FDE68A]/60 rounded-[10px] p-3">
                            Plants make their own food using sunlight. They take water from soil and CO2 from air. Chlorophyll helps. This process is called photosynthesis and it gives oxygen.
                            <span className="ml-1 inline-flex -mb-1">
                              <Star size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
                              <Star size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-[12px] uppercase tracking-wide">Q3. Match the following</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                            <div className="border border-[#E5E7EB] rounded-[8px] p-2.5">Roots → Absorb water</div>
                            <div className="border border-[#E5E7EB] rounded-[8px] p-2.5">Leaves → Make food</div>
                            <div className="border border-[#E5E7EB] rounded-[8px] p-2.5">Stem → Support</div>
                            <div className="border border-[#E5E7EB] rounded-[8px] p-2.5 bg-[#ECFDF5] border-[#A7F3D0] relative">
                              Flower → Reproduction
                              <CheckCircle2 size={14} className="absolute -right-1 -top-1 text-[#16A34A] bg-white rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* page footer */}
                      <div className="mt-8 flex justify-between text-[10px] text-[#9CA3AF] border-t border-[#E5E7EB] pt-3">
                        <span>Student: Aarav Sharma</span>
                        <span>Page 1 of 1</span>
                      </div>
                    </div>

                    {/* floating star annotations */}
                    <div className="absolute right-[18%] top-[42%] flex gap-0.5">
                      <Star size={16} className="text-[#F59E0B] fill-[#F59E0B] drop-shadow-sm" />
                      <Star size={16} className="text-[#F59E0B] fill-[#F59E0B] drop-shadow-sm" />
                    </div>
                  </div>

                  {/* bottom bar */}
                  <div className="h-11 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between px-3">
                    <div className="text-[11px] text-[#6B7280]">Zoom 100% • 1 page</div>
                    <div className="flex items-center gap-1.5">
                      <button className="w-7 h-7 rounded-full bg-white border border-[#E5E7EB] grid place-items-center">
                        <ZoomIn size={14} />
                      </button>
                      <button
                        onClick={() => setShowMarksModal(true)}
                        className="h-7 px-3 rounded-full bg-[#4F46E5] text-white text-[11px] font-semibold"
                      >
                        Add Marks
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-[980px] bg-white rounded-[20px] border border-[#E5E7EB] shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="h-[56px] px-5 flex items-center justify-between border-b border-[#E5E7EB] shrink-0">
              <div className="font-semibold text-[14px]">Upload Attachment</div>
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 rounded-full hover:bg-[#F8F9FB] grid place-items-center border border-[#E5E7EB]">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#E5E7EB] overflow-auto">
              {[
                { l: "Upload", ic: Upload },
                { l: "PDF Question Paper", ic: FileText },
                { l: "Drive", ic: HardDrive },
                { l: "Unsplash", ic: ImageIcon },
                { l: "Pexels", ic: Layers },
              ].map((t) => {
                const active = uploadTab === t.l;
                return (
                  <button
                    key={t.l}
                    onClick={() => setUploadTab(t.l)}
                    className={`whitespace-nowrap h-9 px-3.5 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 border transition ${
                      active ? "bg-[#111827] text-white border-[#111827]" : "bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8F9FB]"
                    }`}
                  >
                    <t.ic size={14} /> {t.l}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-0">
              <div className="border-r border-[#E5E7EB] p-4 flex flex-col gap-4 bg-[#FCFCFD]">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[14px] border-2 border-dashed border-[#D1D5DB] bg-white p-6 text-center hover:bg-[#F8F9FB] cursor-pointer transition"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#EEF2FF] border border-[#C7D2FE] grid place-items-center text-[#4F46E5] mb-3">
                    <Upload size={18} />
                  </div>
                  <div className="text-[13px] font-medium">Drag & drop files here</div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1">PDF, DOCX, PNG up to 25MB</div>
                  <button className="mt-3 h-8 px-4 rounded-full bg-[#111827] text-white text-[12px] font-medium">Choose files</button>
                  <input ref={fileInputRef} type="file" className="hidden" />
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Selected</div>
                  <div className="rounded-[12px] border border-[#4F46E5] bg-[#EEF2FF] p-3 flex gap-2.5">
                    <div className="w-9 h-9 rounded-[8px] bg-white border border-[#C7D2FE] grid place-items-center text-[#4F46E5] shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium truncate">Plants Providers Worksheet.pdf</div>
                      <div className="text-[11px] text-[#6B7280]">342.33KB • 1 page</div>
                    </div>
                    <button className="w-6 h-6 rounded-full bg-white grid place-items-center border border-[#E5E7EB] shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto text-[11px] text-[#9CA3AF] leading-relaxed">Supports: PDF, DOCX, JPG, PNG. Files are scanned for safety.</div>
              </div>

              <div className="p-4 md:p-6 bg-[#F8F9FB] overflow-auto">
                <div className="bg-white rounded-[14px] border border-[#E5E7EB] shadow-sm overflow-hidden max-w-[560px] mx-auto">
                  <div className="h-9 bg-[#F8F9FB] border-b border-[#E5E7EB] flex items-center px-3 justify-between">
                    <span className="text-[11px] font-medium text-[#6B7280]">Preview</span>
                    <span className="text-[11px] text-[#9CA3AF]">Plants Providers Worksheet.pdf</span>
                  </div>
                  <div className="p-6">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] px-2.5 py-1 rounded-full bg-[#111827] text-white">ZYLKER SCHOOL</div>
                      <div className="mt-3 text-[16px] font-bold">PLANTS - PROVIDERS OF FOOD</div>
                      <div className="text-[11px] text-[#6B7280] mt-1">Grade 6 • Fill in the blanks & match the columns</div>
                    </div>
                    <div className="mt-6 space-y-3 text-[12px] leading-relaxed">
                      <div className="h-20 rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                        <div className="text-[11px] font-semibold">Q1. Green leaves make food by ______</div>
                        <div className="mt-2 flex gap-2">
                          <span className="h-6 flex-1 rounded-full border border-dashed border-[#D1D5DB] bg-white" />
                          <span className="h-6 flex-1 rounded-full border border-dashed border-[#D1D5DB] bg-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 rounded-[10px] border border-[#E5E7EB] bg-white p-2.5 text-[11px]">Tap root example: ______</div>
                        <div className="h-16 rounded-[10px] border border-[#E5E7EB] bg-white p-2.5 text-[11px]">Fibrous root example: ______</div>
                      </div>
                      <div className="h-[84px] rounded-[10px] bg-[#FEFCE8] border border-[#FDE68A] p-3 text-[11px]">
                        <b>Diagram:</b> Draw and label parts of a leaf. Show stomata opening.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 max-w-[560px] mx-auto">
                  <button onClick={() => setShowUpload(false)} className="h-9 px-4 rounded-full border border-[#E5E7EB] bg-white text-[13px] font-medium">
                    Cancel
                  </button>
                  <button onClick={handleAttach} className="h-9 px-5 rounded-full bg-[#4F46E5] text-white text-[13px] font-semibold">
                    Attach file
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARKS MODAL */}
      {showMarksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowMarksModal(false)} />
          <div className="relative w-full max-w-[420px] bg-white rounded-[20px] border border-[#E5E7EB] shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[16px]">Evaluate Submission</h3>
              <button onClick={() => setShowMarksModal(false)} className="w-8 h-8 rounded-full border border-[#E5E7EB] grid place-items-center">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-medium">Marks</label>
                <div className="mt-2 relative">
                  <input
                    value={givenMarks}
                    onChange={(e) => setGivenMarks(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-[70px] rounded-[12px] border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                  <span className="absolute right-1 top-1 h-9 px-3 rounded-full bg-[#F8F9FB] border border-[#E5E7EB] grid place-items-center text-[12px] text-[#6B7280]">/ 50</span>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="mt-2 w-full px-3.5 py-3 rounded-[12px] border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowMarksModal(false)} className="h-10 px-4 rounded-full border border-[#E5E7EB] bg-white text-[13px] font-medium">
                Cancel
              </button>
              <button
                onClick={() => setShowMarksModal(false)}
                className="h-10 px-5 rounded-full bg-[#4F46E5] text-white text-[13px] font-semibold"
              >
                Save Evaluation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
