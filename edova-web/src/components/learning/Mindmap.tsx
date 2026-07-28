import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const NODES = [
  { id: "center", label: "Reflection of Light", x: 250, y: 150, type: "center" },
  { id: "laws", label: "Laws", x: 100, y: 60 },
  { id: "types", label: "Types", x: 400, y: 60 },
  { id: "examples", label: "Examples", x: 100, y: 240 },
  { id: "apps", label: "Applications", x: 400, y: 240 },
]

export function Mindmap() {
  const [active, setActive] = useState("center")
  const [flip, setFlip] = useState(false)
  return (
    <div className="grid grid-cols-[70%_30%] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Mindmap - Recollect & Memorize</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 500 300" className="h-[320px] w-full rounded-[8px] border border-card-border bg-white">
            {NODES.filter((n) => n.id !== "center").map((n) => (
              <line key={n.id} x1={250} y1={150} x2={n.x} y2={n.y} stroke="var(--edova-card-border)" strokeWidth="2" />
            ))}
            {NODES.map((n) => (
              <g key={n.id} onClick={() => setActive(n.id)} className="cursor-pointer">
                <rect
                  x={n.x - 50} y={n.y - 18} width="100" height="36" rx="12"
                  fill={n.type === "center" ? "var(--edova-ink)" : active === n.id ? "var(--okf-bg)" : "var(--edova-cream)"}
                  stroke={active === n.id ? "var(--okf-border)" : "var(--edova-card-border)"}
                />
                <text
                  x={n.x} y={n.y + 4} textAnchor="middle" fontSize="12" fontWeight="700"
                  fill={n.type === "center" ? "var(--edova-sidebar-text)" : "var(--edova-ink)"}
                  fontFamily="Poppins"
                >
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-[14px]">Quick Recall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[140px] cursor-pointer flex-col items-center justify-center rounded-[8px] bg-cream p-4" onClick={() => setFlip(!flip)}>
            {!flip ? (
              <>
                <p className="text-sm font-semibold">What is law 1?</p>
                <p className="mt-2 text-xs text-text-secondary">Click to flip</p>
              </>
            ) : (
              <>
                <p className="text-sm">Incident, reflected, normal lie on same plane</p>
                <Badge variant="success" className="mt-2">Got it</Badge>
              </>
            )}
          </div>
          <Button variant="gold" className="mt-4 w-full">Regenerate from my Notes</Button>
        </CardContent>
      </Card>
    </div>
  )
}
