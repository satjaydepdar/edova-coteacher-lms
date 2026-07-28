"use client"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export function FlagButton({ context, className }: { context: string; className?: string }) {
  const [flagged, setFlagged] = useState(false)
  return (
    <div className={className}>
      {!flagged ? (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-white" onClick={()=>setFlagged(true)}>🚩 I Don't Understand</Button>
      ) : (
        <Badge variant="weak" className="animate-in">Teacher notified: {context.slice(0,24)}...</Badge>
      )}
    </div>
  )
}
