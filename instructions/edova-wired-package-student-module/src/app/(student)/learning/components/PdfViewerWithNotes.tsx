"use client"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FlagButton } from "./FlagButton"
import { Badge } from "@/components/ui/badge"

export function PdfViewerWithNotes({ addXP }: any) {
  const [note, setNote] = useState("Law: i = r\nRegular vs Diffuse...\n")
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-4">
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#E5E7EB]">
          <CardTitle className="font-[Poppins] text-[17px]">Textbook - Page 42</CardTitle>
          <div className="flex gap-2"><Button variant="ghost" size="sm">-</Button><Button variant="ghost" size="sm">+</Button></div>
        </CardHeader>
        <CardContent className="p-5 h-[280px] overflow-auto bg-white m-3 rounded-[8px] text-[13px] leading-6 font-[Inter] text-[#13231F]">
          <div className="flex justify-between"><p className="font-[Poppins] font-bold">Reflection of Light</p><FlagButton context="PDF Page 42 Para 1" /></div>
          <p className="mt-3 text-[#6B7280]">When light hits a smooth surface, it bounces back... Law 1: Incident ray, reflected ray and normal lie on same plane. Law 2: i = r.</p>
          <p className="mt-3">Types: 1) Regular - smooth surface 2) Diffuse - rough surface scatters light.</p>
          <div className="mt-4 p-3 bg-[#E9F1EC] border border-[#BFE0D3] rounded-[8px] flex gap-2"><Badge variant="okf">OKF Linked</Badge><span className="text-xs text-[#16332B]">Linked to curriculum C10.SCI.042</span></div>
        </CardContent>
      </Card>
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
        <CardHeader><CardTitle className="font-[Poppins] text-[17px]">My Notes - Saved to Wiki</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={note} onChange={e=>setNote(e.target.value)} className="min-h-[100px] bg-white" placeholder="Take notes..." />
          <div className="flex justify-between">
            <span className="text-xs text-[#6B7280] font-mono">{note.length} chars</span>
            <Button variant="default" onClick={()=>{ setSaved(true); addXP(5); setTimeout(()=>setSaved(false),2000)}}>{saved ? "Saved to Wiki ✓" : "Save to my Wiki Page"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
