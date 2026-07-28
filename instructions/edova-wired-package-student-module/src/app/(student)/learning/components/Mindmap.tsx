"use client"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const NODES = [{ id:"center", label:"Reflection of Light", x:250, y:150, type:"center"}, { id:"laws", label:"Laws", x:100, y:60 }, { id:"types", label:"Types", x:400, y:60 }, { id:"examples", label:"Examples", x:100, y:240 }, { id:"apps", label:"Applications", x:400, y:240 }]

export function Mindmap() {
  const [active, setActive] = useState("center")
  const [flip, setFlip] = useState(false)
  return (
    <div className="grid grid-cols-[70%_30%] gap-6">
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
        <CardHeader><CardTitle className="font-[Poppins] text-[17px]">Dynamic Mindmap - Recollect & Memorize</CardTitle></CardHeader>
        <CardContent>
          <svg viewBox="0 0 500 300" className="w-full h-[320px] bg-white rounded-[8px] border border-[#E5E7EB]">
            {NODES.filter(n=>n.id!=="center").map(n=>(<line key={n.id} x1={250} y1={150} x2={n.x} y2={n.y} stroke="#E5E7EB" strokeWidth="2"/>))}
            {NODES.map(n=>(
              <g key={n.id} onClick={()=>setActive(n.id)} className="cursor-pointer">
                <rect x={n.x-50} y={n.y-18} width="100" height="36" rx="12" fill={n.type==="center" ? "#13231F" : active===n.id ? "#E9F1EC" : "#F5F1E6"} stroke={active===n.id? "#BFE0D3":"#E5E7EB"} />
                <text x={n.x} y={n.y+4} textAnchor="middle" fontSize="12" fontWeight="700" fill={n.type==="center" ? "#FBF7EE" : "#13231F"} fontFamily="Poppins">{n.label}</text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>
      <Card className="bg-white border-[#E5E7EB] rounded-[12px]">
        <CardHeader><CardTitle className="text-[14px] font-[Poppins]">Quick Recall</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[140px] bg-[#F5F1E6] rounded-[8px] p-4 flex flex-col items-center justify-center cursor-pointer" onClick={()=>setFlip(!flip)}>
            {!flip ? <><p className="font-semibold text-sm">What is law 1?</p><p className="text-xs text-[#6B7280] mt-2">Click to flip</p></> : <><p className="text-sm">Incident, reflected, normal lie on same plane</p><Badge variant="success" className="mt-2">Got it</Badge></>}
          </div>
          <Button variant="gold" className="w-full mt-4">Regenerate from my Notes</Button>
        </CardContent>
      </Card>
    </div>
  )
}
