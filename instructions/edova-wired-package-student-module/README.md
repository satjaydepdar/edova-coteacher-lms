# Edova Coteacher - Wired Package
This folder contains real components using your edova-web tokens and shadcn primitives.

## How to install
1. Copy src/app/(student)/learning/ into your edova-web/src/app/(student)/learning/
2. Ensure your components/ui has button, badge, card, input, tabs, checkbox, textarea (shadcn new-york)
3. Your index.css already has --edova-* tokens - no change needed
4. Run npm run dev, go to /learning

## Design System compliance
- All colors via var(--edova-*)
- Sidebar active = rgba(127,191,122,.3) per your Sidebar.tsx
- Topbar border #E5E1D2, Cream #F5F1E6
- Buttons: default=ink, gold= #D9A94E, okf= #E9F1EC/#BFE0D3/#16332B
- Badges: success 12% tint, warning, danger, weak (#FBEBD6/#8A4B1F)
- Typography: Poppins 700 headings, Inter body, JetBrains Mono codes

## Features wired
- Mistake Journal auto-adds wrong answers
- XP + Streak + Badges (gamification)
- Heatmap Red/Yellow/Green
- Study Plan to cure decision fatigue
- FlagButton "I Don't Understand" -> Teacher notified
- Video -> auto quiz -> badge -> PDF + notes -> Wiki
- Lab Exercise draggable SVG
- Mindmap expandable + flashcards

No new dependencies.
