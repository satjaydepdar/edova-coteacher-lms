# PROMPT FOR KIMI 3 - Develop Personal Wiki Notes Feature for Edova Coteacher App

## CONTEXT
You are a senior full-stack developer working on **Edova Coteacher App** - an EdTech app for students (Class 9-10) to read NCERT chapters and for teachers to track them.

We need to build a new feature called **"My Notes - Saved to Wiki"**.

Refer to the attached screenshot UI:
- Top part shows Chapter 9 "Light – Reflection and Refraction" PDF/HTML viewer
- Bottom part shows a text box "My Notes - Saved to Wiki" with placeholder "Take notes..." and a button "Save to my Wiki Page"
- Red handwritten arrows show the flow from chapter text to notes box to save button.

## CORE REQUIREMENTS - DO NOT MISS ANY

### Requirement 1: Auto Wiki Page Creation
1. When admin creates a student account with login credentials, the system must automatically create a personal Wiki page for that student.
2. The link to that wiki page must be added to the student's profile/dashboard.
3. The wiki page should have a unique slug like `/wiki/student-{id}` or `/wiki/{name}-{class}`.
4. Initial template: `# {StudentName}'s Learning Wiki`

### Requirement 2: Select Text to Auto-Populate My Notes
1. Student must be able to select/drag any text from the Chapter viewer (Chapter content is rendered via PDF.js / HTML).
2. Once text is selected (on mouseup / selection end), that selected text MUST automatically appear in the "My Notes - Saved to Wiki" textbox at the bottom.
3. Append logic: New selection should be appended with a newline, not replace old notes. Format as blockquote: `> {selected text}`
4. Update character count live (e.g., "0 chars" -> "45 chars").
5. IMPORTANT: The chapter viewer must be made text-selectable. If it's currently an image, convert rendering to use PDF.js textLayer or HTML rendering.

### Requirement 3: Save Selected Text to Student's Wiki Page
1. On clicking "Save to my Wiki Page" button, the content of the "My Notes" textbox must be saved to that specific student's wiki page.
2. Save format in Wiki should be grouped by chapter and timestamp:
   ```
   ### [DD-MM-YYYY] Ch-9 Light – Reflection and Refraction
   > {selected text}
   {student typed notes}
   ```
3. API should handle append, not overwrite.
4. Show success toast "Saved to Wiki! [View Wiki Page]" with link.

## TECHNICAL SPECIFICATIONS

### Assume Stack:
- Frontend: React Native / Flutter WebView for App, React for Web
- Backend: Node.js (Express) / Python FastAPI
- Database: MySQL / Postgres
- Existing tables: `students (id, name, email, login, password_hash, class)`

### DB Changes to Create:
```sql
CREATE TABLE student_wiki_pages (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  slug VARCHAR(255) UNIQUE,
  title VARCHAR(255),
  content_markdown LONGTEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE student_chapter_notes (
  id UUID PRIMARY KEY,
  student_id UUID,
  chapter_id VARCHAR(50), -- e.g., "CH9-SCIENCE"
  selected_text TEXT,
  my_notes_text TEXT,
  page_no INT,
  created_at TIMESTAMP
);
```

### APIs to Develop:

1. `POST /api/auth/login` - MODIFIY EXISTING
   After auth success, check if wiki exists, if not create it.

2. `GET /api/v1/student/me/wiki`
   Returns: { slug, url, title, content_markdown }

3. `POST /api/v1/notes/save-to-wiki`
   Body: { chapter_id, selected_text, my_notes_text, page_no }
   Logic: Save to student_chapter_notes + Append to student_wiki_pages.content_markdown

### Frontend Tasks:

**Chapter Reader Component (ChapterReader.jsx):**
- Use PDF.js with textLayer enabled OR render chapter as selectable HTML.
- Inject selection listener:
```javascript
document.addEventListener('mouseup', () => {
  const text = window.getSelection().toString().trim();
  if (text.length > 5) {
    // Send to React Native WebView or parent component
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'TEXT_SELECTED', data: text }));
    // Or for web: props.onTextSelected(text)
  }
});
```
- Props: `onTextSelected(selectedText)`

**MyNotes Component (MyNotesBottomSheet.jsx):**
- TextArea with placeholder "Take notes..."
- State: `notesText`
- When `onTextSelected` fires: `setNotesText(prev => prev + "\n> " + selectedText + "\n")`
- Char counter
- Button: "Save to my Wiki Page" -> calls API #3
- Loading state, success toast

**Wiki Page Screen (WikiPageScreen.jsx):**
- Render markdown using `react-markdown`
- Group by chapter
- Allow edit/delete

## ACCEPTANCE CRITERIA

- [ ] New student login -> wiki page auto-created and accessible from profile
- [ ] I can select 3 different paragraphs from Chapter 9 and all 3 appear in My Notes box automatically without manual copy-paste
- [ ] Char count updates
- [ ] Clicking Save actually appends to DB and I can see it on my Wiki Page
- [ ] Refreshing page does not lose saved wiki content
- [ ] Works on both Web and Mobile WebView

## DELIVERABLES EXPECTED FROM YOU

1. Full working code for Frontend (ChapterReader + MyNotes + WikiPage)
2. Backend APIs (with error handling)
3. DB migration script
4. Handle edge cases: empty selection, duplicate save, very long selection (>1000 chars)
5. Do not use placeholder TODOs. Give production-ready code.

Start coding now.
