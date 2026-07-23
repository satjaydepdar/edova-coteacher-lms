<!-- converted from Learning-Resources-Developer-Handoff-Notes.docx -->












Developer Handoff Notes (CSS/Styling Guidelines to accompany wireframes):
Font: Use a clean, high-x-height Sans-Serif (e.g., Inter, Roboto).
Status Colors:
Assigned: #16a34a (Green-600) with font-weight 500.
Ready: #6b7280 (Gray-500) with font-weight 400.
Missing: #dc2626 (Red-600) with font-weight 500.
Overlays: Use position: fixed; inset: 0; z-index: 50; for the dark backdrop, and center the content card with max-width: 640px; width: 100%;. Add a subtle translate-y transition for the slide-up effect.
Checkboxes: Hide the default browser checkbox. Use custom divs styled as subtle square borders [ □ ] that fill solid [ ■ ] when selected.
Sticky Bar: Apply position: sticky; bottom: 0; background: white; border-top: 1px solid #f3f4f6; padding: 16px;. It should only appear when selectedItems.length > 0.

Here are the exact, step-by-step interaction flows translated into technical requirements.
You can copy and paste everything below the line directly into Claude (or your developer) to build the React components. It defines the state changes, component structure, and user actions without any ambiguity.

SYSTEM ARCHITECTURE CONTEXT FOR CLAUDE:
Framework: React (Functional components with Hooks).
Routing: Single Page Application. Level 1 and Level 2 are NOT separate routes. Level 2 expands inline (accordion style) below the clicked topic in Level 1.
Modals/Overlays: Do NOT use full-page modals. Video, Document viewer, and Upload forms must be lightweight overlays that slide up over the Level 2 list, preserving scroll position.
State Management: Use local useState for UI toggles (selected items, open overlays). Use a global state (Zustand/Context) or SWR/React-Query for fetching OKF data.
Design Rules: NO ICONS. Use only text, whitespace, and subtle color-coded text (Green for "Assigned", Gray for "Ready", Red for "Missing").

FLOW 1: Update and Exit
Goal: Teacher opens the app to quickly check the status of upcoming topics and closes the app. Components involved: <LevelOneDashboard />
Step-by-Step Interactions:
Load: App loads <LevelOneDashboard />. It fetches the teacher's assigned classes and upcoming topics.
View: Teacher views the list of upcoming topics (e.g., "Linear Equations"). Under each topic, they read the status text: Video: Assigned • Slides: Ready • Quiz: Missing.
Filter (Optional): Teacher clicks the Class 8A dropdown at the top, selects Class 9B. The list instantly re-renders to show Class 9B topics without a page reload.
Exit: Teacher closes the browser tab or switches apps. No state needs to be saved.

FLOW 2: Upload and Assign
Goal: Teacher sees a resource is "Missing" from OKF, uploads a new file, waits for AI processing, and assigns it. Components involved: <LevelOneDashboard /> → <LevelTwoTopicDetail /> → <UploadOverlay />
Step-by-Step Interactions:
Expand: On <LevelOneDashboard />, teacher clicks the text "Linear Equations". An accordion expands to reveal <LevelTwoTopicDetail />.
Identify Gap: Teacher reads the list and sees text: Quiz: No quiz available in OKF library for this topic followed by a text button [Upload to OKF].
Open Upload: Teacher clicks [Upload to OKF]. <UploadOverlay /> slides up over the list.
Input Data: Teacher types "Practice Set A" into the Title input field.
File Select: Teacher clicks the dropzone area and selects a PDF from their OS file picker.
Submit: Teacher clicks the [Upload] button.
Processing State: The overlay closes. Back on <LevelTwoTopicDetail />, a new row appears at the bottom of the Quiz section with a pulsing gray text state: Practice Set A • Processing by AI....
Ready State: After 2 seconds (simulated backend response), the text updates to: Practice Set A • 10 questions • OKF Library, and a checkbox appears on the right: [ □ Select ].
Select: Teacher clicks the checkbox. It changes to [ ■ Selected ].
Assign: The sticky bottom bar updates to [Assign 1 item →]. Teacher clicks it.
Success State: The button text instantly morphs to [ ✅ Assigned for tomorrow ]. The checkbox row text changes from gray "Ready" to green "Assigned".

FLOW 3: Assign (Direct)
Goal: Teacher knows the OKF resources are already there, just wants to quickly push them to students. Components involved: <LevelOneDashboard /> → <LevelTwoTopicDetail />
Step-by-Step Interactions:
Expand: On <LevelOneDashboard />, teacher clicks "Linear Equations" to expand <LevelTwoTopicDetail />.
Bulk Select: Teacher sees three items marked as "Ready". They click the checkboxes next to "Solving Equations Step-by-Step", "Key Formulas & Shortcuts", and "Practice Set A". All three change to [ ■ Selected ].
Assign: The sticky bottom bar updates to [Assign 3 items →]. Teacher clicks it.
Success State: The button morphs to [ ✅ Assigned for tomorrow ]. All three selected rows update their text status from gray "Ready" to green "Assigned". The checkboxes disappear and are replaced by the text [Undo].

FLOW 4: Preview and Assign
Goal: Teacher wants to watch a concept video and read a worksheet before deciding whether to assign them to students. Components involved: <LevelOneDashboard /> → <LevelTwoTopicDetail /> → <VideoOverlay /> → <DocumentOverlay />
Step-by-Step Interactions:
Expand: On <LevelOneDashboard />, teacher clicks "Linear Equations" to expand <LevelTwoTopicDetail />.
Open Video: Teacher sees Introduction to Linear Equations 8 min • OKF Curated [ □ Select ]. Teacher clicks the text title (not the checkbox). <VideoOverlay /> slides up.
Interact with Video: The video auto-plays. Teacher watches for 15 seconds. The overlay shows a checkbox at the bottom: [ □ Add to assignment list ]. Teacher leaves it unchecked.
Close Video: Teacher clicks the ✕ top-right button. The overlay closes instantly, revealing the exact same scroll position in <LevelTwoTopicDetail />.
Open Second Video: Teacher clicks Solving Equations Step-by-Step. <VideoOverlay /> opens with the new video.
Select from Inside Overlay: Teacher likes this video. While the video plays, they click the checkbox inside the overlay: [ ■ Add to assignment list ]. It becomes checked.
Close Video: Teacher clicks ✕. Overlay closes.
Verify List State: Back on <LevelTwoTopicDetail />, the checkbox next to "Solving Equations Step-by-Step" is now automatically checked [ ■ Selected ].
Open Document: Teacher clicks Practice Set A (Beginner). <DocumentOverlay /> slides up, rendering the PDF.
Select from Inside Overlay: Teacher reads it, clicks [ ■ Add to assignment list ] inside the overlay, and clicks ✕ to close.
Final Assign: Back on the list, two items are checked. Teacher clicks the sticky bottom bar [Assign 2 items →].
Success State: Button morphs to [ ✅ Assigned for tomorrow ]. Status text turns green.
