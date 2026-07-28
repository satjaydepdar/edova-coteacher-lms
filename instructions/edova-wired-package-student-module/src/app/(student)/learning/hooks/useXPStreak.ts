"use client"
import { useState } from "react"
export function useXPStreak() {
  const [xp, setXp] = useState(1240)
  const [streak, setStreak] = useState(7)
  const addXP = (v: number) => setXp(x=>x+v)
  return { xp, streak, addXP }
}
