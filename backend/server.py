from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import json
import tempfile
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, Tuple
import uuid
from datetime import datetime, timezone
from groq import Groq
import PyPDF2
import docx
import io
from pydub import AudioSegment
import wave
import subprocess
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from ai_tutor import chat_with_ai_tutor
from ats_analyzer import analyze_resume_vs_jd, create_fallback_ats_analysis

import sys

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)

# Run startup health checks
def run_startup_checks():
    """Run startup health checks and system setup"""
    try:
        result = subprocess.run(
            ['bash', '/app/startup_checks.sh'],
            capture_output=True,
            text=True,
            timeout=60
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        if result.returncode != 0:
            logging.error("Startup checks failed with code: " + str(result.returncode))
    except Exception as e:
        logging.error(f"Failed to run startup checks: {e}")

# Run checks on import
run_startup_checks()

# Continue with normal setup
db = client[os.environ['DB_NAME']]

# Initialize Groq client
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class InterviewSetup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    job_description: str
    resume_text: str
    resume_summary: str = ""  # Summarized version to reduce tokens
    jd_summary: str = ""  # Summarized JD to reduce tokens
    difficulty: str = "medium"  # easy, medium, hard
    questions: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InterviewSetupCreate(BaseModel):
    role: str
    job_description: str

class QuestionGenerationResponse(BaseModel):
    questions: List[str]
    setup_id: str

class InterviewFeedback(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    setup_id: str
    feedback: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InterviewFeedbackCreate(BaseModel):
    setup_id: str
    audio_data: str  # Base64 encoded audio (WebM format)

class InterviewSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    setup_id: str
    current_question_index: int = 0
    answered_questions: List[Dict[str, Any]] = []
    status: str = "active"  # active, completed, abandoned
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionAnswerCreate(BaseModel):
    question_id: str
    question_text: str  # The actual question text that was asked
    audio_data: str  # Base64 encoded audio

class NextQuestionResponse(BaseModel):
    question_id: str
    question_text: str
    question_index: int
    total_questions: int
    is_final: bool = False

class AudioProcessingResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

def chat_with_oss_model(messages, model="llama-3.1-8b-instant", **kwargs):
    """
    messages: list of dicts with "role" ("system"/"user"/"assistant") and "content"
    `kwargs` can include other parameters like temperature, max_tokens, etc.
    """
    try:
        resp = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        return resp.choices[0].message.content
    except Exception as e:
        logging.error(f"Groq API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

def summarize_text(text: str, text_type: str = "resume") -> str:
    """
    Summarize resume or JD to reduce token usage while preserving key information
    """
    try:
        system_prompt = f"""You are an expert at summarizing {text_type}s. Create a concise summary that:
- Preserves all key skills, technologies, and qualifications
- Maintains important experience details and achievements
- Keeps critical requirements or responsibilities
- Reduces length by 60-70% while retaining essential information

Return ONLY the summary, no additional text."""

        user_prompt = f"Summarize this {text_type}:\n\n{text}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        summary = chat_with_oss_model(messages, temperature=0.3, max_tokens=500)
        logging.info(f"Successfully summarized {text_type}: {len(text)} chars -> {len(summary)} chars")
        return summary.strip()
        
    except Exception as e:
        logging.error(f"Summarization error for {text_type}: {e}")
        # If summarization fails, return truncated version
        return text[:1000] + "..." if len(text) > 1000 else text

def text_to_speech(text: str, voice: str = "Fritz-PlayAI") -> bytes:
    """
    Convert text to speech using Groq's PlayAI TTS model
    Returns audio bytes in WAV format
    """
    try:
        response = groq_client.audio.speech.create(
            model="playai-tts",
            voice=voice,
            input=text,
            response_format="wav"
        )
        
        # The Groq client returns a BinaryAPIResponse object
        # Use the read() method to get the binary content
        return response.read()
                
    except Exception as e:
        logging.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS service error: {str(e)}")

def transcribe_audio(audio_file_path: str, model: str = "whisper-large-v3-turbo", language: str = "en") -> Tuple[str, bool, str]:
    """
    Transcribe audio using Groq's Whisper model
    Returns: (transcript, success, error_message)
    Note: Now accepts any audio and returns meaningful results even for silent audio
    """
    try:
        if not audio_file_path or not os.path.exists(audio_file_path):
            logging.warning("transcribe_audio: wav file missing.")
            return "No response recorded", True, "No wav file"

        size = os.path.getsize(audio_file_path)
        logging.info(f"Transcription: reading wav path {audio_file_path} ({size} bytes)")

        if size == 0:
            return "No response recorded", True, "Zero-length wav"

        with open(audio_file_path, "rb") as f:
            audio_bytes = f.read()
        try:
            transcription = groq_client.audio.transcriptions.create(
                file=(os.path.basename(audio_file_path), audio_bytes),
                model=model,
                language=language,
                response_format="text"
            )
        except Exception as api_error:
            logging.warning(f"Transcription API failed: {api_error}")
            return "No response recorded", True, "Transcription API error"

        if not transcription or not transcription.strip():
            return "No response recorded", True, None

        # simple clean / filter
        transcript_clean = transcription.strip()
        whisper_hallucinations = [
            "thank you", "thanks", "you", ".", ",", "the", "a", "an", "i", "me", 
            "hello", "hi", "okay", "ok", "yes", "no", "um", "uh", "hmm"
        ]
        
        if (len(transcript_clean) < 3 or 
            transcript_clean.lower() in whisper_hallucinations or
            all(word.lower() in whisper_hallucinations for word in transcript_clean.split())):
            return "No clear response detected", True, None
        
        return transcript_clean, True, None

    except Exception as e:
        logging.warning(f"Audio transcription error: {e}")
        return "Audio processing completed - no clear response detected", True, None

def convert_webm_to_wav(webm_data: bytes) -> Tuple[Optional[str], bool, Optional[str]]:
    """
    Convert WebM bytes to WAV using ffmpeg subprocess, robustly detect 'no audio' cases.
    Returns (wav_path, success, message)
    """
    logging.info("=== Audio Conversion Started ===")
    logging.info(f"Input: {len(webm_data) if webm_data else 0} bytes of WebM data")
    
    if not webm_data or len(webm_data) == 0:
        logging.warning("No audio bytes provided — creating a small silent WAV fallback.")
        silent_audio = AudioSegment.silent(duration=1000)  # 1s silence
        wav_path = tempfile.mktemp(suffix=".wav")
        silent_audio.export(wav_path, format="wav")
        return wav_path, True, "No audio bytes — processed as silent"

    webm_path = None
    wav_path = None
    try:
        # write webm to temp file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as webm_temp:
            webm_temp.write(webm_data)
            webm_temp.flush()
            webm_path = webm_temp.name

        webm_size = os.path.getsize(webm_path)
        logging.info(f"✓ Saved WebM to: {webm_path} ({webm_size} bytes)")

        # Check if ffmpeg is available
        try:
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            logging.info("✓ FFmpeg is available")
        except FileNotFoundError:
            logging.error("✗ CRITICAL: FFmpeg not found! Audio conversion will fail.")
            raise Exception("FFmpeg not installed")

        # Use ffprobe to check whether there is any audio stream
        try:
            probe_cmd = ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "default=nw=1", webm_path]
            probe = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            logging.info(f"✓ FFprobe check complete")
            logging.debug(f"  ffprobe stdout: {probe.stdout}")
            logging.debug(f"  ffprobe stderr: {probe.stderr}")
            has_audio = bool(probe.stdout.strip())
        except FileNotFoundError:
            # ffprobe missing — we'll attempt ffmpeg conversion anyway
            logging.warning("⚠ ffprobe not found; attempting ffmpeg conversion directly.")
            has_audio = True

        if not has_audio:
            logging.warning("✗ No audio stream found in WebM file. Creating silent WAV fallback.")
            silent_audio = AudioSegment.silent(duration=1000)
            wav_path = tempfile.mktemp(suffix=".wav")
            silent_audio.export(wav_path, format="wav")
            # remove webm temp
            try:
                os.unlink(webm_path)
            except:
                pass
            return wav_path, True, "No audio track in uploaded file - processed as silent"

        # Convert with ffmpeg to WAV (mono, 16k) — robust conversion path
        wav_path = tempfile.mktemp(suffix=".wav")
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-i", webm_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            wav_path
        ]
        logging.info(f"Running ffmpeg to convert audio: {' '.join(ffmpeg_cmd)}")
        proc = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        logging.debug(f"ffmpeg returncode={proc.returncode}; stderr={proc.stderr}")

        if proc.returncode != 0 or not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
            logging.warning(f"ffmpeg conversion failed or produced empty output. returncode={proc.returncode}")
            # fallback to creating a silent file (so higher layers continue gracefully)
            try:
                silent_audio = AudioSegment.silent(duration=1000)
                wav_path = tempfile.mktemp(suffix=".wav")
                silent_audio.export(wav_path, format="wav")
                return wav_path, True, "ffmpeg failed to decode - processed as silent"
            finally:
                try:
                    os.unlink(webm_path)
                except:
                    pass

        # success — remove webm and return wav path
        try:
            os.unlink(webm_path)
        except:
            pass

        logging.info(f"Audio converted successfully to {wav_path} ({os.path.getsize(wav_path)} bytes)")
        return wav_path, True, None

    except Exception as e:
        logging.warning(f"Audio conversion error: {e}")
        # cleanup
        if webm_path and os.path.exists(webm_path):
            try:
                os.unlink(webm_path)
            except:
                pass
        # fallback silent file
        try:
            silent_audio = AudioSegment.silent(duration=1000)
            wav_path = tempfile.mktemp(suffix=".wav")
            silent_audio.export(wav_path, format="wav")
            return wav_path, True, f"Audio processing failed and was processed as silent: {e}"
        except Exception as final_err:
            logging.error(f"Critical audio processing failure: {final_err}")
            return None, False, f"Complete audio processing failure: {str(e)}"

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file content"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logging.error(f"PDF extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from PDF")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file content"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = docx.Document(docx_file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        logging.error(f"DOCX extraction error: {e}")
        raise HTTPException(status_code=400, detail="Failed to extract text from DOCX")

def generate_interview_questions(resume_text: str, job_description: str, role: str) -> List[str]:
    """Generate personalized interview questions based on resume and job description"""
    
    system_prompt = """You are an expert interview coach. Generate 1 personalized interview questions based on the candidate's resume and the job description. Mix technical, behavioral, and situational questions.

Make the questions realistic and relevant to the specific role and candidate's background. Return ONLY a JSON array of questions, no other text."""

    user_prompt = f"""
    Role: {role}
    
    Resume Content:
    {resume_text}
    
    Job Description:
    {job_description}
    
    Generate 1 interview questions that would be asked for this role, considering the candidate's background from their resume.
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        response = chat_with_oss_model(messages, temperature=0.7, max_tokens=1000)
        
        # Clean the response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]  # Remove ```
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove ending ```
        cleaned_response = cleaned_response.strip()
        
        # Try to parse as JSON
        questions_data = json.loads(cleaned_response)
        if isinstance(questions_data, list) and len(questions_data) > 0:
            # Extract question text from objects or use strings directly
            questions = []
            for item in questions_data:
                if isinstance(item, dict) and 'question' in item:
                    questions.append(item['question'])
                elif isinstance(item, str):
                    questions.append(item)
            return questions[:10]  # Limit to 10 questions
        else:
            # Fallback if JSON parsing fails
            return [
                "Tell me about yourself and your background.",
                "Why are you interested in this position?",
                "What are your greatest strengths?",
                "Describe a challenging project you've worked on.",
                "How do you handle working under pressure?",
                "Where do you see yourself in 5 years?",
                "What motivates you in your work?",
                "Tell me about a time you had to work in a team."
            ]
    except Exception as e:
        logging.error(f"Question generation error: {e}")
        # Return fallback questions
        return [
            "Tell me about yourself and your background.",
            "Why are you interested in this position?",
            "What are your greatest strengths?",
            "Describe a challenging project you've worked on.",
            "How do you handle working under pressure?",
            "Where do you see yourself in 5 years?",
            "What motivates you in your work?",
            "Tell me about a time you had to work in a team."
        ]

def check_transcript_quality(transcript: str) -> tuple[bool, str, int]:
    """
    Check transcript quality and return (is_valid, reason, suggested_score)
    Returns: (is_sufficient, reason, score)
    """
    if not transcript or not transcript.strip():
        return False, "No transcript available", 20
    
    words = transcript.strip().split()
    word_count = len(words)
    
    # Very short responses (less than 10 words)
    if word_count < 10:
        logging.warning(f"Transcript too short: {word_count} words")
        return False, "Response too brief (less than 10 words)", 25
    
    # Check for common non-answers
    common_non_answers = ["i don't know", "i'm not sure", "no idea", "can't answer", "don't remember"]
    transcript_lower = transcript.lower()
    
    non_answer_count = sum(1 for phrase in common_non_answers if phrase in transcript_lower)
    
    # If response is short AND mostly non-answers
    if word_count < 30 and non_answer_count > 0:
        logging.warning(f"Low quality transcript: {word_count} words with non-answers")
        return False, "Insufficient response with unclear answers", 30
    
    # Check for mostly filler words
    filler_words = ["um", "uh", "like", "you know", "basically", "actually", "literally"]
    filler_count = sum(transcript_lower.count(filler) for filler in filler_words)
    
    if word_count > 0 and (filler_count / word_count) > 0.3:
        logging.warning(f"High filler word ratio: {filler_count}/{word_count}")
        return False, "Response contains too many filler words", 35
    
    # Transcript seems acceptable
    return True, "Sufficient response quality", 50

def create_poor_quality_feedback(reason: str, score: int, questions: List[str]) -> Dict[str, Any]:
    """Create feedback for poor quality transcripts"""
    return {
        "overall_score": score,
        "communication_skills": {
            "score": score,
            "feedback": f"Limited communication detected: {reason}. Practice providing more detailed responses."
        },
        "technical_depth": {
            "score": score - 5,
            "feedback": "Unable to assess technical knowledge from minimal responses."
        },
        "confidence_level": {
            "score": score - 10,
            "feedback": "Low confidence indicated by brief or unclear responses."
        },
        "structure_clarity": {
            "score": score,
            "feedback": "Response structure could not be properly evaluated due to insufficient content."
        },
        "content_relevance": {
            "score": score - 5,
            "feedback": "Limited content provided to evaluate relevance to questions."
        },
        "suggestions": [
            "Provide more detailed and structured responses",
            "Take time to think before answering",
            "Use the STAR method (Situation, Task, Action, Result) for behavioral questions",
            "Practice speaking clearly and confidently",
            "Expand on your answers with specific examples",
            "Avoid filler words like 'um', 'uh', 'like'",
            "Retake the interview when better prepared"
        ]
    }

def generate_interview_feedback(audio_transcript: str, questions: List[str]) -> Dict[str, Any]:
    """Generate AI feedback based on interview responses (handles zero responses gracefully)"""
    
    system_prompt = """You are an expert interview coach analyzing a candidate's actual interview responses. Provide detailed, constructive feedback based on their real answers.

Analyze the following criteria and respond in JSON format:

{
  "overall_score": 85,
  "communication_skills": {
    "score": 80,
    "feedback": "Detailed analysis of speaking clarity, pace, and articulation based on actual responses"
  },
  "technical_depth": {
    "score": 90,
    "feedback": "Assessment of technical knowledge demonstrated in their answers"
  },
  "confidence_level": {
    "score": 75,
    "feedback": "Evaluation of confidence based on speech patterns and content delivery"
  },
  "structure_clarity": {
    "score": 85,
    "feedback": "Analysis of how well-organized and logical their responses were"
  },
  "content_relevance": {
    "score": 88,
    "feedback": "How well they addressed the specific questions asked"
  },
  "suggestions": [
    "Specific, actionable improvements based on their actual performance"
  ]
}

Provide honest, constructive feedback with scores out of 100. Base your analysis entirely on the actual responses provided."""

    # Handle cases where there are no meaningful responses
    transcript_clean = audio_transcript.strip().lower() if audio_transcript else ""
    no_response_indicators = [
        "", "no response recorded", "no clear response detected", 
        "audio processing completed - no clear response detected",
        "thank you", "thanks", "you", "hello", "hi", "okay", "ok",
        "thank you.", "thanks.", "you.", "hello.", "hi.", "okay.", "ok."
    ]
    
    # Check for minimal/no responses
    if (not audio_transcript or 
        transcript_clean in no_response_indicators or
        len(transcript_clean) < 5):
        logging.info(f"Zero response detected: '{audio_transcript}' -> using zero response feedback")
        return create_zero_response_feedback(questions)
    
    # NEW: Check transcript quality before sending to LLM
    is_sufficient, reason, suggested_score = check_transcript_quality(audio_transcript)
    if not is_sufficient:
        logging.warning(f"Poor transcript quality: {reason} (score: {suggested_score})")
        return create_poor_quality_feedback(reason, suggested_score, questions)
    
    user_prompt = f"""
    Interview Questions Asked:
    {json.dumps(questions, indent=2)}
    
    Candidate's Actual Responses (Transcribed from Audio):
    {audio_transcript}
    
    Please analyze these real responses and provide detailed feedback on the candidate's performance. Focus on specific aspects of their answers, communication style, and areas for improvement based on what they actually said.
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        response = chat_with_oss_model(messages, temperature=0.3, max_tokens=2000)
        
        # Try to parse JSON response
        feedback = json.loads(response)
        
        # Validate required fields exist
        required_fields = ["overall_score", "communication_skills", "technical_depth", "confidence_level", "structure_clarity", "suggestions"]
        for field in required_fields:
            if field not in feedback:
                raise ValueError(f"Missing required field: {field}")
        
        logging.info("Successfully generated interview feedback from LLM")
        return feedback
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error in feedback generation: {e}")
        logging.error(f"Raw LLM response: {response[:500]}...")  # Log first 500 chars
        return create_fallback_feedback()
    except Exception as e:
        logging.error(f"Feedback generation error: {type(e).__name__}: {str(e)}")
        return create_fallback_feedback()

def create_fallback_feedback() -> Dict[str, Any]:
    """Create fallback feedback when AI analysis fails"""
    return {
        "overall_score": 30,
        "communication_skills": {
            "score": 30,
            "feedback": "Unable to fully analyze communication skills due to processing error."
        },
        "technical_depth": {
            "score": 30,
            "feedback": "Technical assessment incomplete due to processing error."
        },
        "confidence_level": {
            "score": 30,
            "feedback": "Confidence evaluation unavailable due to processing error."
        },
        "structure_clarity": {
            "score": 30,
            "feedback": "Response structure analysis incomplete due to processing error."
        },
        "content_relevance": {
            "score": 30,
            "feedback": "Content relevance could not be fully assessed due to processing error."
        },
        "suggestions": [
            "Please ensure clear audio recording for better AI analysis",
            "Speak slowly and clearly during the interview",
            "Provide structured responses to questions",
            "Consider retaking the interview for more accurate feedback"
        ]
    }

def generate_interview_pdf_report(feedback_data: dict, setup_data: dict, session_data: dict = None) -> bytes:
    """Generate a comprehensive PDF report of the interview with all Q&A pairs"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        alignment=1,  # Center
        textColor=colors.HexColor('#1f2937')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=10,
        spaceBefore=15,
        textColor=colors.HexColor('#374151')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=12,
        spaceAfter=6,
        spaceBefore=8,
        textColor=colors.HexColor('#4b5563'),
        fontName='Helvetica-Bold'
    )
    
    answer_style = ParagraphStyle(
        'AnswerStyle',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=20,
        spaceBefore=4,
        spaceAfter=8,
        textColor=colors.HexColor('#374151')
    )
    
    story = []
    
    # Title
    story.append(Paragraph("PracticePal Interview Report", title_style))
    story.append(Spacer(1, 15))
    
    # Interview Details
    story.append(Paragraph("Interview Details", heading_style))
    
    difficulty = setup_data.get('difficulty', 'medium').upper()
    session_stats = feedback_data.get('feedback', {}).get('session_stats', {})
    
    interview_details = [
        ["Role:", setup_data.get('role', 'Not specified').replace('-', ' ').title()],
        ["Difficulty:", difficulty],
        ["Date:", datetime.now().strftime("%B %d, %Y")],
        ["Questions Answered:", str(session_stats.get('questions_answered', 0))],
        ["Total Questions:", str(session_stats.get('total_questions_planned', 8))]
    ]
    
    details_table = Table(interview_details, colWidths=[1.5*inch, 4*inch])
    details_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 15))
    
    # Overall Score
    story.append(Paragraph("Overall Performance", heading_style))
    feedback = feedback_data.get('feedback', {})
    overall_score = feedback.get('overall_score', 0)
    score_color = colors.green if overall_score >= 70 else colors.orange if overall_score >= 40 else colors.red
    
    story.append(Paragraph(f"<font color='{score_color.hexval()}' size='18'><b>{overall_score}/100</b></font>", styles['Normal']))
    story.append(Spacer(1, 15))
    
    # Detailed Scores
    story.append(Paragraph("Detailed Assessment", heading_style))
    
    score_categories = [
        ('communication_skills', 'Communication Skills'),
        ('technical_depth', 'Technical Depth'),
        ('confidence_level', 'Confidence Level'),
        ('structure_clarity', 'Response Structure'),
        ('content_relevance', 'Content Relevance')
    ]
    
    for category_key, category_name in score_categories:
        if category_key in feedback:
            category_data = feedback[category_key]
            story.append(Paragraph(category_name, subheading_style))
            
            score = category_data.get('score', 0)
            score_color = colors.green if score >= 70 else colors.orange if score >= 40 else colors.red
            story.append(Paragraph(f"<font color='{score_color.hexval()}'><b>Score: {score}/100</b></font>", styles['Normal']))
            story.append(Paragraph(category_data.get('feedback', ''), styles['Normal']))
            story.append(Spacer(1, 8))
    
    # Questions and Answers - Now with actual Q&A from session
    story.append(Spacer(1, 10))
    story.append(Paragraph("Interview Questions & Your Responses", heading_style))
    
    if session_data and 'answered_questions' in session_data:
        answered_questions = session_data['answered_questions']
        
        for i, qa in enumerate(answered_questions, 1):
            # Question
            story.append(Paragraph(f"<b>Question {i}:</b>", subheading_style))
            question_text = qa.get('question_text', 'Question not recorded')
            story.append(Paragraph(question_text, styles['Normal']))
            story.append(Spacer(1, 4))
            
            # Answer
            story.append(Paragraph("<b>Your Response:</b>", subheading_style))
            transcript = qa.get('transcript', 'No response recorded')
            # Truncate very long responses
            if len(transcript) > 500:
                transcript = transcript[:500] + "... (response truncated)"
            story.append(Paragraph(transcript, answer_style))
            story.append(Spacer(1, 10))
    else:
        story.append(Paragraph("No question-answer data available.", styles['Normal']))
    
    # Strengths and Weaknesses Analysis
    story.append(Spacer(1, 10))
    story.append(Paragraph("Strengths & Areas for Improvement", heading_style))
    
    # Analyze strengths (categories with score >= 70)
    strengths = [cat_name for cat_key, cat_name in score_categories 
                 if cat_key in feedback and feedback[cat_key].get('score', 0) >= 70]
    
    if strengths:
        story.append(Paragraph("<b>Strengths:</b>", subheading_style))
        for strength in strengths:
            story.append(Paragraph(f"• {strength}", styles['Normal']))
        story.append(Spacer(1, 8))
    
    # Analyze weaknesses (categories with score < 70)
    weaknesses = [cat_name for cat_key, cat_name in score_categories 
                  if cat_key in feedback and feedback[cat_key].get('score', 0) < 70]
    
    if weaknesses:
        story.append(Paragraph("<b>Areas for Improvement:</b>", subheading_style))
        for weakness in weaknesses:
            story.append(Paragraph(f"• {weakness}", styles['Normal']))
        story.append(Spacer(1, 8))
    
    # Improvement Suggestions
    story.append(Spacer(1, 10))
    story.append(Paragraph("Recommendations", heading_style))
    suggestions = feedback.get('suggestions', [])
    for i, suggestion in enumerate(suggestions, 1):
        story.append(Paragraph(f"{i}. {suggestion}", styles['Normal']))
        story.append(Spacer(1, 4))
    
    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph("Generated by PracticePal AI Mock Interview Platform", 
                          ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, 
                                       alignment=1, textColor=colors.grey)))
    
    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    logging.info(f"Generated PDF report with {len(answered_questions) if session_data else 0} Q&A pairs")
    return pdf_bytes

def create_zero_response_feedback(questions: List[str]) -> Dict[str, Any]:
    """Create feedback for interviews with zero or minimal responses"""
    return {
        "overall_score": 20,
        "communication_skills": {
            "score": 15,
            "feedback": "No verbal responses were detected. Communication skills could not be evaluated."
        },
        "technical_depth": {
            "score": 15,
            "feedback": "No technical responses provided. Unable to assess technical knowledge and capabilities."
        },
        "confidence_level": {
            "score": 10,
            "feedback": "No responses recorded. Confidence level cannot be determined from silence."
        },
        "structure_clarity": {
            "score": 10,
            "feedback": "No structured responses provided. Organization and clarity of thoughts could not be assessed."
        },
        "content_relevance": {
            "score": 10,
            "feedback": "No content provided to evaluate relevance to the questions asked."
        },
        "suggestions": [
            "Ensure microphone is working and audio is being recorded properly",
            "Practice speaking clearly and at an appropriate volume",
            "Prepare responses to common interview questions in advance",
            "Take time to think through your answers before speaking",
            "Consider practicing mock interviews to build confidence",
            "Retake the interview when you're ready to provide verbal responses"
        ]
    }

def generate_next_question(setup_data: dict, answered_questions: List[Dict[str, Any]], question_index: int) -> str:
    """Generate the next interview question based on previous answers and context - uses summaries for efficiency"""
    
    difficulty = setup_data.get('difficulty', 'medium')
    difficulty_instructions = {
        'easy': "Generate straightforward questions suitable for entry-level or junior candidates. Focus on basic concepts and foundational knowledge.",
        'medium': "Generate intermediate-level questions that test practical experience and understanding. Balance between basic and advanced concepts.",
        'hard': "Generate challenging questions for senior-level candidates. Include complex scenarios, system design, and advanced problem-solving."
    }
    
    system_prompt = f"""You are an expert interview coach conducting a dynamic interview at {difficulty.upper()} difficulty level.

{difficulty_instructions.get(difficulty, difficulty_instructions['medium'])}

Generate the next question based on:
1. The candidate's resume and target role
2. The job description requirements  
3. Previous questions and answers (if any)
4. The interview progression

Generate a single, relevant question that:
- Builds upon previous responses when applicable
- Matches the {difficulty} difficulty level
- Covers different aspects (technical, behavioral, situational)
- Is specific to the role and candidate background

Return ONLY the question text, no additional formatting."""

    # Build context from previous answers
    previous_context = ""
    if answered_questions:
        previous_context = "\n\nPrevious Questions and Responses:\n"
        for i, qa in enumerate(answered_questions[-3:], 1):  # Include last 3 Q&As for context
            previous_context += f"Q{i}: {qa.get('question_text', '')}\n"
            previous_context += f"A{i}: {qa.get('transcript', 'No response recorded')}\n\n"

    # Use summaries instead of full text to reduce tokens
    resume_content = setup_data.get('resume_summary', setup_data.get('resume_text', ''))
    jd_content = setup_data.get('jd_summary', setup_data.get('job_description', ''))

    user_prompt = f"""
    Role: {setup_data.get('role', '')}
    Difficulty Level: {difficulty.upper()}
    
    Resume Summary:
    {resume_content}
    
    Job Description Summary:
    {jd_content}
    
    Current Question Number: {question_index + 1}
    
    {previous_context}
    
    Generate the next appropriate interview question for this candidate at {difficulty} difficulty level.
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        response = chat_with_oss_model(messages, temperature=0.7, max_tokens=200)
        logging.info(f"Generated question {question_index + 1} at {difficulty} difficulty")
        return response.strip()
    except Exception as e:
        logging.error(f"Next question generation error: {e}")
        # Fallback questions based on interview progression and difficulty
        fallback_questions = {
            'easy': [
                "Tell me about yourself and your background.",
                "Why are you interested in this position?",
                "What are your main strengths?",
                "Describe a project you've worked on.",
                "How do you stay updated with new technologies?",
                "What motivates you in your work?",
                "Tell me about a time you worked in a team.",
                "Where do you see yourself in the future?"
            ],
            'medium': [
                "Tell me about yourself and your relevant experience.",
                "Why are you interested in this position?",
                "What are your greatest strengths and how have you applied them?",
                "Describe a challenging project you've worked on and how you handled it.",
                "How do you handle working under pressure or tight deadlines?",
                "Where do you see yourself in 5 years?",
                "What's your approach to learning new technologies?",
                "Tell me about a time you had to resolve a conflict in a team."
            ],
            'hard': [
                "Walk me through your most complex technical project and the architectural decisions you made.",
                "How would you design a scalable system for [specific use case]?",
                "Describe a situation where you had to make a critical technical trade-off.",
                "How do you approach system optimization and performance tuning?",
                "Tell me about a time when you had to lead a team through a major technical challenge.",
                "How do you balance technical debt with feature development?",
                "Describe your approach to mentoring junior developers.",
                "What strategies do you use for ensuring code quality and maintainability in large projects?"
            ]
        }
        questions = fallback_questions.get(difficulty, fallback_questions['medium'])
        return questions[min(question_index, len(questions) - 1)]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "PracticePal API - AI Mock Interview Platform"}

@api_router.post("/interview/setup")
async def create_interview_setup(
    role: str = Form(...),
    job_description: str = Form(...),
    resume_file: UploadFile = File(...),
    difficulty: str = Form("medium")  # New: difficulty level
):
    """Create a new interview setup with resume parsing - NO question pre-generation"""
    try:
        # Validate difficulty
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'medium'
        
        # Read the uploaded file
        file_content = await resume_file.read()
        
        # Extract text based on file type
        if resume_file.filename.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(file_content)
        elif resume_file.filename.lower().endswith(('.docx', '.doc')):
            resume_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX files.")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the resume file.")
        
        # Generate summaries to reduce token usage
        logging.info("Generating resume and JD summaries...")
        resume_summary = summarize_text(resume_text, "resume")
        jd_summary = summarize_text(job_description, "job description")
        
        # Create interview setup WITHOUT pre-generating questions
        setup = InterviewSetup(
            role=role,
            job_description=job_description,
            resume_text=resume_text,
            resume_summary=resume_summary,
            jd_summary=jd_summary,
            difficulty=difficulty,
            questions=[]  # Empty - questions will be generated dynamically
        )
        
        # Store in database
        doc = setup.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.interview_setups.insert_one(doc)
        
        # Create an interview session
        session = InterviewSession(
            setup_id=setup.id,
            current_question_index=0,
            answered_questions=[],
            status="active"
        )
        
        session_doc = session.model_dump()
        session_doc['created_at'] = session_doc['created_at'].isoformat()
        await db.interview_sessions.insert_one(session_doc)
        
        logging.info(f"Created interview setup {setup.id} with difficulty: {difficulty}")
        return {
            "setup_id": setup.id,
            "session_id": session.id,
            "difficulty": difficulty,
            "message": "Interview setup created successfully. Call /next to begin."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Interview setup error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create interview setup")

@api_router.get("/interview/setup/{setup_id}")
async def get_interview_setup(setup_id: str):
    """Get interview setup by ID"""
    setup = await db.interview_setups.find_one({"id": setup_id}, {"_id": 0})
    if not setup:
        raise HTTPException(status_code=404, detail="Interview setup not found")
    
    # Convert ISO string timestamp back to datetime
    if isinstance(setup['created_at'], str):
        setup['created_at'] = datetime.fromisoformat(setup['created_at'])
    
    return setup

@api_router.post("/interview/feedback")
async def create_interview_feedback(feedback_data: InterviewFeedbackCreate):
    """Generate and store interview feedback from real audio"""
    try:
        # Get the interview setup
        setup = await db.interview_setups.find_one({"id": feedback_data.setup_id}, {"_id": 0})
        if not setup:
            raise HTTPException(status_code=404, detail="Interview setup not found")
        
        # Decode base64 audio data
        try:
            raw_audio_string = feedback_data.audio_data or ""
            # Accept either data URLs (data:video/webm;base64,...) or raw base64
            if raw_audio_string.startswith("data:"):
                # split off the header
                try:
                    _, b64part = raw_audio_string.split(",", 1)
                    audio_bytes = base64.b64decode(b64part)
                except Exception as e:
                    logging.warning(f"Failed to decode data URL audio: {e}")
                    audio_bytes = b""
            else:
                try:
                    audio_bytes = base64.b64decode(raw_audio_string)
                except Exception as e:
                    logging.warning(f"Failed to base64 decode audio string: {e}")
                    audio_bytes = b""
        except Exception as e:
            logging.warning(f"Invalid audio data overall: {e}")
            audio_bytes = b""  # Use empty audio as fallback

        logging.info(f"Decoded audio bytes length: {len(audio_bytes)}")
        
        # Convert WebM to WAV format - always succeeds now
        wav_file_path, conversion_success, conversion_message = convert_webm_to_wav(audio_bytes)
        
        try:
            # Transcribe audio - always succeeds now
            logging.info("Starting audio transcription...")
            transcript, transcription_success, transcription_message = transcribe_audio(
                wav_file_path, model="whisper-large-v3-turbo", language="en"
            )
            
            logging.info(f"Transcription completed: '{transcript}' ({len(transcript)} characters)")
            
            # Generate feedback based on transcript (even if it's "No response recorded")
            feedback_result = generate_interview_feedback(transcript, setup['questions'])
            
            # Add transcript and processing info to feedback
            feedback_result['transcript'] = transcript
            if conversion_message:
                feedback_result['audio_processing_note'] = conversion_message
            
        finally:
            # Clean up temporary WAV file
            if wav_file_path and os.path.exists(wav_file_path):
                try:
                    os.unlink(wav_file_path)
                except Exception as cleanup_error:
                    logging.warning(f"Failed to clean up temp file: {cleanup_error}")
        
        # Create feedback object
        feedback = InterviewFeedback(
            setup_id=feedback_data.setup_id,
            feedback=feedback_result
        )
        
        # Store in database
        doc = feedback.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.interview_feedback.insert_one(doc)
        
        logging.info(f"Feedback generated successfully for setup {feedback_data.setup_id}")
        return feedback
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Feedback generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process interview feedback: {str(e)}")

@api_router.get("/interview/feedback/{setup_id}")
async def get_interview_feedback(setup_id: str):
    """Get interview feedback by setup ID"""
    feedback = await db.interview_feedback.find_one({"setup_id": setup_id}, {"_id": 0})
    if not feedback:
        raise HTTPException(status_code=404, detail="Interview feedback not found")
    
    # Convert ISO string timestamp back to datetime
    if isinstance(feedback['created_at'], str):
        feedback['created_at'] = datetime.fromisoformat(feedback['created_at'])
    
    return feedback

@api_router.get("/interview/report/{setup_id}")
async def download_interview_report(setup_id: str):
    """Download comprehensive PDF report for interview with all Q&A"""
    try:
        # Get feedback data
        feedback = await db.interview_feedback.find_one({"setup_id": setup_id}, {"_id": 0})
        if not feedback:
            raise HTTPException(status_code=404, detail="Interview feedback not found")
        
        # Get setup data
        setup = await db.interview_setups.find_one({"id": setup_id}, {"_id": 0})
        if not setup:
            raise HTTPException(status_code=404, detail="Interview setup not found")
        
        # Get session data to retrieve all Q&A pairs
        session = await db.interview_sessions.find_one({"setup_id": setup_id, "status": "completed"}, {"_id": 0})
        
        # Generate PDF with session data
        pdf_bytes = generate_interview_pdf_report(feedback, setup, session)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"PracticePal_Interview_Report_{timestamp}.pdf"
        
        logging.info(f"Generated PDF report for setup {setup_id}")
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"PDF generation error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

# Dynamic Interview Flow Endpoints
@api_router.post("/interview/create")
async def create_interview_session(setup_id: str = Form(...)):
    """Create a new dynamic interview session"""
    try:
        # Verify the setup exists
        setup = await db.interview_setups.find_one({"id": setup_id}, {"_id": 0})
        if not setup:
            raise HTTPException(status_code=404, detail="Interview setup not found")
        
        # Create new session
        session = InterviewSession(setup_id=setup_id)
        
        # Store in database
        doc = session.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.interview_sessions.insert_one(doc)
        
        return {"session_id": session.id, "message": "Interview session created successfully"}
        
    except Exception as e:
        logging.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/interview/{session_id}/next")
async def get_next_question(session_id: str):
    """Get the next question for the interview session with TTS audio - Optimized"""
    try:
        # Parallel fetch of session and setup data
        session_task = db.interview_sessions.find_one({"id": session_id}, {"_id": 0})
        session = await session_task
        
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session['status'] != 'active':
            raise HTTPException(status_code=400, detail="Interview session is not active")
        
        # Fetch setup data
        setup = await db.interview_setups.find_one({"id": session['setup_id']}, {"_id": 0})
        if not setup:
            raise HTTPException(status_code=404, detail="Interview setup not found")
        
        # Generate next question dynamically
        question_text = generate_next_question(
            setup, 
            session['answered_questions'], 
            session['current_question_index']
        )
        
        question_id = f"{session_id}_q{session['current_question_index']}"
        
        # Generate TTS audio for the question - with reduced model temperature for faster response
        try:
            audio_bytes = text_to_speech(question_text, voice="Fritz-PlayAI")
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        except Exception as tts_error:
            logging.error(f"TTS generation failed: {tts_error}")
            audio_base64 = None  # Continue without TTS if it fails
        
        # Determine if this is the final question (limit to 8 questions)
        is_final = session['current_question_index'] >= 7
        
        return {
            "question_id": question_id,
            "question_text": question_text,
            "question_audio": audio_base64,  # Base64 encoded WAV audio
            "question_index": session['current_question_index'],
            "total_questions": 8,
            "is_final": is_final
        }
        
    except Exception as e:
        logging.error(f"Next question error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/interview/{session_id}/answer")
async def submit_question_answer(session_id: str, answer_data: QuestionAnswerCreate):
    """Submit answer for a question and get evaluation"""
    try:
        # Get session
        session = await db.interview_sessions.find_one({"id": session_id}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        # Decode and transcribe audio - always succeeds now
        try:
            raw_audio_string = answer_data.audio_data or ""
            # Accept either data URLs (data:video/webm;base64,...) or raw base64
            if raw_audio_string.startswith("data:"):
                # split off the header
                try:
                    _, b64part = raw_audio_string.split(",", 1)
                    audio_bytes = base64.b64decode(b64part)
                except Exception as e:
                    logging.warning(f"Failed to decode data URL audio: {e}")
                    audio_bytes = b""
            else:
                try:
                    audio_bytes = base64.b64decode(raw_audio_string)
                except Exception as e:
                    logging.warning(f"Failed to base64 decode audio string: {e}")
                    audio_bytes = b""
        except Exception as e:
            logging.warning(f"Invalid audio data overall: {e}")
            audio_bytes = b""  # Use empty audio as fallback

        logging.info(f"Decoded audio bytes length: {len(audio_bytes)}")
        
        # Convert audio - always succeeds
        wav_file_path, conversion_success, conversion_message = convert_webm_to_wav(audio_bytes)
        
        try:
            # Transcribe audio - always succeeds
            transcript, transcription_success, transcription_message = transcribe_audio(
                wav_file_path, model="whisper-large-v3-turbo", language="en"
            )
                
        finally:
            if wav_file_path and os.path.exists(wav_file_path):
                try:
                    os.unlink(wav_file_path)
                except Exception as cleanup_error:
                    logging.warning(f"Failed to clean up temp file: {cleanup_error}")
        
        # Get the setup for validation
        setup = await db.interview_setups.find_one({"id": session['setup_id']}, {"_id": 0})
        if not setup:
            raise HTTPException(status_code=404, detail="Interview setup not found")
        
        # Use the actual question text that was asked (passed from frontend)
        question_text = answer_data.question_text
        
        # Add answer to session
        answer_record = {
            "question_id": answer_data.question_id,
            "question_text": question_text,  # Store the ACTUAL question that was asked
            "question_index": session['current_question_index'],
            "transcript": transcript,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Update session in database
        await db.interview_sessions.update_one(
            {"id": session_id},
            {
                "$push": {"answered_questions": answer_record},
                "$inc": {"current_question_index": 1}
            }
        )
        
        return {
            "message": "Answer submitted successfully",
            "transcript": transcript,
            "question_index": session['current_question_index']
        }
        
    except Exception as e:
        logging.error(f"Answer submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/interview/{session_id}/end")
async def end_interview_session(session_id: str):
    """End the interview session and generate final feedback"""
    try:
        # Get session
        session = await db.interview_sessions.find_one({"id": session_id}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        # Mark session as completed
        await db.interview_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "completed"}}
        )
        
        # Get setup data for question context
        setup = await db.interview_setups.find_one({"id": session['setup_id']}, {"_id": 0})
        
        # Generate combined transcript from stored Q&A
        combined_transcript = ""
        questions_asked = []
        
        for answer in session['answered_questions']:
            question_text = answer.get('question_text', 'Question not recorded')
            questions_asked.append(question_text)
            combined_transcript += f"Q: {question_text}\nA: {answer.get('transcript', '')}\n\n"
        
        # Generate feedback based on all responses
        if combined_transcript.strip():
            feedback_result = generate_interview_feedback(combined_transcript, questions_asked)
        else:
            feedback_result = create_fallback_feedback()
        
        # Add session stats
        feedback_result['session_stats'] = {
            "questions_answered": len(session['answered_questions']),
            "total_questions_planned": 8,
            "session_id": session_id
        }
        
        # Create feedback object
        feedback = InterviewFeedback(
            setup_id=session['setup_id'],
            feedback=feedback_result
        )
        
        # Store feedback
        doc = feedback.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.interview_feedback.insert_one(doc)
        
        return feedback
        
    except Exception as e:
        logging.error(f"Session end error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



# ============================================
# AI TUTOR ENDPOINTS
# ============================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@api_router.post("/ai-tutor/chat")
async def ai_tutor_chat(request: ChatRequest):
    """AI Tutor chat endpoint for career guidance and interview prep"""
    try:
        # Convert Pydantic models to dicts for Groq
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Get response from AI Tutor - pass groq_client
        response = chat_with_ai_tutor(groq_client, messages)
        
        logging.info("AI Tutor chat response generated successfully")
        return {"response": response, "success": True}
        
    except Exception as e:
        logging.error(f"AI Tutor chat error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI Tutor")

# ============================================
# ATS ANALYZER ENDPOINTS
# ============================================

@api_router.post("/ats/analyze")
async def analyze_resume_ats(
    job_description: str = Form(...),
    resume_file: UploadFile = File(...)
):
    """Analyze resume against job description using ATS"""
    try:
        # Read and parse resume
        file_content = await resume_file.read()
        
        if resume_file.filename.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(file_content)
        elif resume_file.filename.lower().endswith(('.docx', '.doc')):
            resume_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX.")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from resume file.")
        
        # Perform ATS analysis - pass groq_client
        analysis = analyze_resume_vs_jd(groq_client, resume_text, job_description)
        
        logging.info(f"ATS analysis complete. Match: {analysis.get('match_percentage', 0)}%")
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"ATS analysis endpoint error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze resume")

# Include the API router in the main app (MUST be after all endpoint definitions)
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()