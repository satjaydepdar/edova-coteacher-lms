// Shared inline style fragments for the Assessment Builder page + modals —
// exact values moved verbatim from the page.
import type { CSSProperties } from "react"
import { X } from "lucide-react"

export const stepBadge: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  background: "#F8F0D8",
  color: "#D9A94E",
  border: "1px solid rgba(201,168,76,.25)",
}
export const fieldLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3D5A60", textTransform: "uppercase", letterSpacing: ".4px" }
export const nativeSelect: CSSProperties = { fontSize: 15, color: "#13231F", padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF", background: "#F5F1E6", cursor: "pointer", fontFamily: "inherit" }
export const stepCard: CSSProperties = { background: "rgba(255,255,255,.9)", border: "1px solid #D8E8E4", borderRadius: 16, padding: "18px 20px", marginBottom: 20, boxShadow: "0 4px 24px rgba(26,46,53,.06)" }
export const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(26,46,53,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 24 }
export const closeBtn: CSSProperties = { width: 32, height: 32, border: "none", borderRadius: 8, background: "#F2F0EB", cursor: "pointer", color: "#7A9298", display: "flex", alignItems: "center", justifyContent: "center" }
export const secondaryBtn: CSSProperties = { background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }
export const editorInput: CSSProperties = { fontSize: 15, padding: "8px 10px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit" }
export const editorTextarea: CSSProperties = { width: "100%", minHeight: 60, resize: "vertical", border: "1px solid #DDD8CF", borderRadius: 8, fontFamily: "inherit", fontSize: 15, padding: "9px 12px" }
export const editorSectionLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3D5A60", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }

/** Header + scroll body + optional footer modal frame (OKF import, video
 * lesson, manage questions, diagnostics share this exact chrome). */
export function ModalShell({
  title,
  onClose,
  children,
  footer,
  maxWidth = 680,
}: {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: number
}) {
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDD8CF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#13231F" }}>{title}</div>
          <div onClick={onClose} style={closeBtn}><X size={20} /></div>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", borderTop: "1px solid #DDD8CF" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
