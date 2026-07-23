import { useState, useRef, useEffect } from 'react'
import './App.css'
import ReactMarkdown from 'react-markdown'

function App() {
  const [messages, setMessages] = useState([])
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentQuote, setCurrentQuote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [uploadSubject, setUploadSubject] = useState('Physics')
  const [pdfUploaded, setPdfUploaded] = useState(false)
  const messagesEndRef = useRef(null)

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/documents')
      const data = await res.json()
      if (data.documents && data.documents.length > 0) {
        setDocuments(data.documents)
        // Only set selected doc to the first one if we don't have one selected
        setSelectedDoc(prev => prev || data.documents[0].path)
        setPdfUploaded(true)
      }
    } catch (e) {
      console.error("Failed to fetch documents", e)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('subject', uploadSubject)
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        await fetchDocuments()
      } else {
        alert("Upload failed")
      }
    } catch (err) {
      console.error(err)
      alert("Upload failed")
    }
    setIsUploading(false)
  }

  const handleChat = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    const userMsg = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)
    
    try {
      const history = messages.map(m => ({
          role: m.role,
          explanation: m.content || m.explanation
      }))
      
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, chat_history: history })
      })
      const data = await res.json()
      
      const assistantMsg = {
        role: 'assistant',
        chapter_name: data.structured_answer?.chapter_name,
        explanation: data.structured_answer?.explanation || "Error parsing answer.",
        page_number: data.structured_answer?.page_number,
        source_file: data.structured_answer?.source_file,
        quote: data.structured_answer?.quote
      }
      setMessages(prev => [...prev, assistantMsg])
      
      if (data.structured_answer?.page_number) {
        setCurrentPage(parseInt(data.structured_answer.page_number) || 1)
      }
      
      if (data.structured_answer?.quote) {
        setCurrentQuote(data.structured_answer.quote)
      } else {
        setCurrentQuote('')
      }
      // If the LLM returned a source_file, switch the PDF viewer to that file!
      if (data.structured_answer?.source_file && data.structured_answer.source_file !== "Unknown") {
        setSelectedDoc(data.structured_answer.source_file)
      }
      
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', explanation: 'Error connecting to server.' }])
    }
    setIsLoading(false)
  }

  return (
    <div className="app-container">
      {/* LEFT PANE: Chat Interface */}
      <div className="chat-pane">
        <header className="chat-header">
          <h1>Textbook Tutor</h1>
          <div className="upload-container" style={{display: 'flex', flexDirection: 'column', gap: '10px', width: '100%'}}>
            {documents.length > 0 && (
              <select 
                value={selectedDoc} 
                onChange={(e) => setSelectedDoc(e.target.value)}
                style={{padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit'}}
              >
                {/* Group documents by subject */}
                {Object.entries(
                  documents.reduce((acc, doc) => {
                    if (!acc[doc.subject]) acc[doc.subject] = [];
                    acc[doc.subject].push(doc);
                    return acc;
                  }, {})
                ).map(([subject, docs]) => (
                  <optgroup key={subject} label={subject}>
                    {docs.map(doc => (
                      <option key={doc.path} value={doc.path}>{doc.filename}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            
            <div style={{display: 'flex', gap: '10px'}}>
              <input 
                type="text" 
                value={uploadSubject} 
                onChange={(e) => setUploadSubject(e.target.value)}
                placeholder="Subject (e.g. Physics)"
                style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit'}}
              />
              <label className="upload-btn" style={{flex: 1, textAlign: 'center'}}>
                {isUploading ? "Uploading..." : "Upload PDF"}
                <input type="file" accept="application/pdf" onChange={handleUpload} disabled={isUploading} style={{display: 'none'}} />
              </label>
            </div>
          </div>
        </header>

        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.role === 'user' ? (
                <div className="bubble user-bubble">{msg.content}</div>
              ) : (
                <div className="bubble bot-bubble">
                  {msg.chapter_name && msg.chapter_name !== "No Relevant Content" && (
                    <div className="chapter-title">{msg.chapter_name}</div>
                  )}
                  <ReactMarkdown>{msg.explanation}</ReactMarkdown>
                  {msg.page_number > 0 && (
                    <div className="page-citation">
                      Source: {msg.source_file || selectedDoc} - Page {msg.page_number}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="bubble bot-bubble typing-indicator">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={handleChat}>
          <input 
            type="text" 
            placeholder="Ask a question about the textbook..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading || !pdfUploaded}
          />
          <button type="submit" disabled={isLoading || !pdfUploaded || !query.trim()}>
            Send
          </button>
        </form>
      </div>

      {/* RIGHT PANE: PDF Viewer */}
      <div className="pdf-pane">
        {pdfUploaded && selectedDoc ? (
          <iframe 
            key={`${selectedDoc}-${currentPage}-${currentQuote}`}
            src={`http://127.0.0.1:8000/api/pdf?filename=${encodeURIComponent(selectedDoc)}#page=${currentPage}&navpanes=0&view=Fit${currentQuote ? `&search=${encodeURIComponent('"' + currentQuote + '"')}` : ''}`} 
            title="PDF Viewer"
            className="pdf-iframe"
          />
        ) : (
          <div className="pdf-placeholder">
            <h2>No Document Loaded</h2>
            <p>Upload a PDF to start reading and chatting.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
