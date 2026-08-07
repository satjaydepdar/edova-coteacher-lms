import { useNavigate } from "react-router-dom"
import React from "react"

export default function Portal() {
  const navigate = useNavigate()

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeDoc = e.currentTarget.contentDocument || e.currentTarget.contentWindow?.document
      if (!iframeDoc) return

      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (attempts > 40) {
          clearInterval(interval)
          return
        }

        // ====== 1. HOOK LOGIN BUTTONS ======
        const allElements = iframeDoc.querySelectorAll('a, button, div, span')
        let foundButtons = false

        allElements.forEach(el => {
          if ((el as any)._portalHooked) return
          const text = el.textContent?.trim() || ''
          const textLower = text.toLowerCase()

          let role: string | null = null
          if (textLower === 'admin login') role = 'admin'
          else if (textLower === 'teacher login') role = 'teacher'
          else if (textLower === 'student login') role = 'student'
          else if (textLower === 'login' && (el.tagName === 'BUTTON' || el.tagName === 'A')) role = ''

          if (role !== null) {
            foundButtons = true
            ;(el as any)._portalHooked = true
            ;(el as HTMLElement).style.cursor = 'pointer'
            el.addEventListener('click', (ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              ev.stopImmediatePropagation()
              navigate(role ? `/login?role=${role}` : '/login')
            }, true)
          }
        })

        // ====== 2. REPLACE LOGO ======
        // The logo text "Edova." is split across multiple <span> elements,
        // so we find the "Education. Evolved." subtitle text and go to its parent container
        allElements.forEach(el => {
          if ((el as any)._logoProcessed) return
          const htmlEl = el as HTMLElement
          const text = (htmlEl.textContent || '').trim()
          
          // Look for the "Education. Evolved." subtitle div
          if (text === 'Education. Evolved.' || text === 'EDUCATION. EVOLVED.') {
            (el as any)._logoProcessed = true
            // The parent of this div should be the logo container
            const logoContainer = htmlEl.parentElement
            if (logoContainer && !(logoContainer as any)._logoReplaced) {
              (logoContainer as any)._logoReplaced = true
              logoContainer.innerHTML = '<img src="/logo-cropped.png" style="height: 55px; width: auto; object-fit: contain; cursor: pointer;" alt="Edova Logo" />'
            }
          }
        })

        // ====== 3. HIDE ADMIN, TEACHERS, STUDENTS, LOGIN FROM HEADER ======
        allElements.forEach(el => {
          if ((el as any)._menuProcessed) return
          const htmlEl = el as HTMLElement
          const text = (htmlEl.textContent || '').trim()
          const textUpper = text.toUpperCase()

          // Only hide exact matches (not elements that contain these as part of larger text)
          if (text.length < 15 && 
              (textUpper === 'ADMIN' || textUpper === 'TEACHERS' || textUpper === 'STUDENTS' || textUpper === 'LOGIN')) {
            const rect = htmlEl.getBoundingClientRect()
            // Only hide if in the header area (top 100px)
            if (rect.top >= 0 && rect.top < 100) {
              (el as any)._menuProcessed = true
              htmlEl.style.display = 'none'
            }
          }
        })

        if (foundButtons && attempts > 3) {
          // Keep running a few more times to catch late-rendered elements
          // but don't stop early
        }
      }, 500)

    } catch (err) {
      console.error("Could not inject iframe click handlers", err)
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <iframe 
        src="/Edova-Gateway.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Edova Gateway"
        onLoad={handleIframeLoad}
      />
    </div>
  )
}
