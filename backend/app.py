from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import os
import logging

from mi import (
    api_router as mi_router,
    extract_text_from_pdf,
    extract_text_from_docx,
    groq_client,
)
from ai_tutor import chat_with_ai_tutor
from ats_analyzer import analyze_resume_vs_jd


class AITutorChatRequest(BaseModel):
    messages: List[Dict[str, str]]


class AITutorChatResponse(BaseModel):
    response: str


app = FastAPI()


# Landing endpoint (can be used by frontend to check API and route to dashboard)
@app.get("/")
async def root():
    return {"message": "PracticePal API - API Root", "routes": ["/api/interview/*", "/api/ai-tutor/chat", "/api/ats/analyze"]}


# Include mock interview routes from existing server module
app.include_router(mi_router)


# AI Tutor endpoint
@app.post("/api/ai-tutor/chat", response_model=AITutorChatResponse)
async def ai_tutor_chat(payload: AITutorChatRequest):
    try:
        tutor_response = chat_with_ai_tutor(groq_client, payload.messages)
        return {"response": tutor_response}
    except Exception as e:
        logging.error(f"AI Tutor endpoint error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI Tutor")


# ATS Resume Analyzer endpoint
@app.post("/api/ats/analyze")
async def ats_analyze_resume(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
):
    """Analyze a resume against a job description using LLM-based ATS analyzer."""
    try:
        file_content = await resume_file.read()

        # Extract text from resume
        if resume_file.filename.lower().endswith(".pdf"):
            resume_text = extract_text_from_pdf(file_content)
        elif resume_file.filename.lower().endswith((".docx", ".doc")):
            resume_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX files.")

        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the resume file.")

        analysis = analyze_resume_vs_jd(groq_client, resume_text, job_description)
        return JSONResponse(content=analysis)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ATS analysis endpoint error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze resume")


# CORS configuration (mirror previous behaviour)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Basic logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
