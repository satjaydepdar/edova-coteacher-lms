"use client"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FlagButton } from "./FlagButton"

export function LabExercise({ addXP }: any) {
  const [angle, setAngle] = useState(45)
  const [ans, setAns] = useState("")
  const [ok, setOk] = useState<boolean| null>(null)
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
        <CardHeader><CardTitle className="font-[Poppins] text-[17px]">Interactive Lab - Drag to place incident ray</CardTitle></CardHeader>
        <CardContent>
          <svg viewBox="0 0 300 200" className="w-full h-[200px] bg-white rounded-[8px] border border-[#E5E7EB]">
            <line x1="0" y1="100" x2="300" y2="100" stroke="#E5E7EB" strokeWidth="2"/>
            <line x1="150" y1="100" x2={150+80*Math.cos((angle-90)*Math.PI/180)} y2={100+80*Math.sin((angle-90)*Math.PI/180)} stroke="#13231F" strokeWidth="3"/>
            <line x1="150" y1="100" x2={150+80*Math.cos((90-angle)*Math.PI/180)} y2={100+80*Math.sin((90-angle)*Math.PI/180)} stroke="#D9A94E" strokeWidth="3" strokeDasharray="6 4"/>
            <circle cx="150" cy="100" r="4" fill="#13231F"/>
          </svg>
          <div className="flex gap-2 mt-3 items-center"><span className="text-sm">Angle:</span><Input type="range" min="10" max="80" value={angle} onChange={e=>setAngle(Number(e.target.value))} className="flex-1"/><Badge variant="secondary" className="font-mono">{angle}°</Badge></div>
          <FlagButton context={`Lab angle ${angle}°`} className="mt-3"/>
        </CardContent>
      </Card>
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
        <CardHeader><CardTitle className="font-[Poppins] text-[17px]">Hands-on Check</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">If incident is {angle}°, what is reflected?</p>
          <div className="flex gap-2"><Input value={ans} onChange={e=>setAns(e.target.value)} placeholder="e.g. 45" className="bg-white"/><Button variant="default" onClick={()=>{ const o = Number(ans)===angle; setOk(o); if(o) addXP(30)}}>Check</Button></div>
          {ok !== null && <Badge variant={ok? "success":"danger"}>{ok? "Correct! +30 XP Lab Master":"Try again, remember i=r"}</Badge>}
        </CardContent>
      </Card>
    </div>
  )
}
