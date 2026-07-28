import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLearningStore } from "@/store/learning-store"

export function FlagButton({ context, className }: { context: string; className?: string }) {
  const [flagged, setFlagged] = useState(false)
  const flag = useLearningStore((s) => s.flag)
  return (
    <div className={className}>
      {!flagged ? (
        <Button variant="outline" size="sm" className="h-7 gap-1 bg-white text-xs" onClick={() => { flag(context); setFlagged(true) }}>
          🚩 I Don't Understand
        </Button>
      ) : (
        <Badge variant="weak" className="animate-in">Teacher notified: {context.slice(0, 24)}...</Badge>
      )}
    </div>
  )
}
