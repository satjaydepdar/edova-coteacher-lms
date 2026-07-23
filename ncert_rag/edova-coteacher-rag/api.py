from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import tempfile
import os
import shutil
from dotenv import load_dotenv
import nest_asyncio

# Load environment variables from .env file
load_dotenv()
nest_asyncio.apply()

from agent import DocumentAgent

app = FastAPI()

# Allow the Vite dev server on any localhost port — it picks 5174, 5175, …
# when 5173 is taken, so a fixed list breaks the moment the port shifts.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = None
uploaded_pdf_path = None

class ChatRequest(BaseModel):
    query: str
    chat_history: list = []

@app.on_event("startup")
async def startup_event():
    global agent
    agent = DocumentAgent()

@app.post("/api/upload")
def upload_document(file: UploadFile = File(...), subject: str = Form("Uncategorized")):
    global uploaded_pdf_path
    try:
        # Sanitize subject to avoid directory traversal
        clean_subject = os.path.basename(subject.strip())
        if not clean_subject:
            clean_subject = "Uncategorized"
            
        temp_dir = os.path.join(os.getcwd(), "uploads", clean_subject)
        os.makedirs(temp_dir, exist_ok=True)
        
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        uploaded_pdf_path = file_path
        
        # We pass the relative path (e.g. Physics/Chapter 1.pdf) so the AI returns it accurately
        relative_path = f"{clean_subject}/{file.filename}"
        agent.ingest(file_path, original_filename=relative_path)
        return {"status": "success", "message": "Document ingested successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        result = agent.answer(request.query, chat_history=request.chat_history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
def get_documents():
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    if not os.path.exists(uploads_dir):
        return {"documents": []}
    
    docs = []
    # Walk through uploads to find categorized files
    for root, dirs, files in os.walk(uploads_dir):
        for f in files:
            if f.endswith(".pdf"):
                rel_path = os.path.relpath(os.path.join(root, f), uploads_dir)
                subject = os.path.dirname(rel_path) or "Uncategorized"
                # Use forward slash for web consistency
                web_path = rel_path.replace("\\", "/")
                docs.append({"filename": f, "subject": subject, "path": web_path})
                
    return {"documents": docs}

@app.get("/api/pdf")
def get_pdf(filename: str = None):
    global uploaded_pdf_path
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    
    if filename:
        target_path = os.path.abspath(os.path.join(uploads_dir, filename))
        if target_path.startswith(os.path.abspath(uploads_dir)) and os.path.exists(target_path):
            return FileResponse(target_path, media_type="application/pdf")
    
    if not uploaded_pdf_path or not os.path.exists(uploaded_pdf_path):
        # Fallback to checking the uploads directory for any PDF
        if os.path.exists(uploads_dir):
            for root, _, files in os.walk(uploads_dir):
                for f in files:
                    if f.endswith(".pdf"):
                        uploaded_pdf_path = os.path.join(root, f)
                        break
                if uploaded_pdf_path: break
                
    if not uploaded_pdf_path or not os.path.exists(uploaded_pdf_path):
        raise HTTPException(status_code=404, detail="No PDF uploaded")
    return FileResponse(uploaded_pdf_path, media_type="application/pdf")

@app.get("/images/{filename}")
async def get_image(filename: str):
    img_path = os.path.join(os.getcwd(), "images", filename)
    if os.path.exists(img_path):
        mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
        return FileResponse(img_path, media_type=mime)
    raise HTTPException(status_code=404, detail="Image not found")


