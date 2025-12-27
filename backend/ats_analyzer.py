# ATS Analyzer Module - Resume vs JD analysis
import logging
import json
from typing import Dict, Any

def analyze_resume_vs_jd(groq_client, resume_text: str, job_description: str, model: str = "openain/gpt-oss-120b") -> Dict[str, Any]:
    """
    Analyze resume against job description using LLM
    Returns detailed analysis with match percentage, strengths, gaps, etc.
    """
    
    system_prompt = """You are an expert ATS (Applicant Tracking System) analyzer and career coach. 
Analyze the provided resume against the job description and return a detailed assessment.

You MUST respond with ONLY valid JSON in this exact format:
{
  "match_percentage": <number 0-100>,
  "overall_assessment": "<brief summary>",
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    ...
  ],
  "gaps": [
    "<gap 1>",
    "<gap 2>",
    ...
  ],
  "keyword_analysis": {
    "matched_keywords": ["<keyword1>", "<keyword2>", ...],
    "missing_keywords": ["<keyword1>", "<keyword2>", ...]
  },
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    ...
  ],
  "section_scores": {
    "skills": <number 0-100>,
    "experience": <number 0-100>,
    "education": <number 0-100>,
    "formatting": <number 0-100>
  }
}

Do NOT include any markdown formatting, explanatory text, or code blocks. Return ONLY the JSON object."""

    user_prompt = f"""JOB DESCRIPTION:
{job_description}

---

RESUME:
{resume_text}

---

Analyze this resume against the job description and provide a comprehensive ATS analysis."""

    try:
        response = groq_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=2500
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
        if response_text.endswith('```'):
            response_text = response_text.rsplit('\n', 1)[0]
        response_text = response_text.strip()
        
        # Parse JSON
        analysis = json.loads(response_text)
        
        # Validate required fields
        required_fields = ['match_percentage', 'overall_assessment', 'strengths', 'gaps', 'recommendations']
        for field in required_fields:
            if field not in analysis:
                raise ValueError(f"Missing required field: {field}")
        
        logging.info(f"ATS analysis complete. Match: {analysis['match_percentage']}%")
        return analysis
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error in ATS analysis: {e}")
        logging.error(f"Raw response: {response_text[:500]}...")
        return create_fallback_ats_analysis()
    except Exception as e:
        logging.error(f"ATS analysis error: {type(e).__name__}: {str(e)}")
        return create_fallback_ats_analysis()

def create_fallback_ats_analysis() -> Dict[str, Any]:
    """Fallback analysis when LLM fails"""
    return {
        "match_percentage": 50,
        "overall_assessment": "Unable to complete full analysis. Please ensure your resume is well-formatted and try again.",
        "strengths": [
            "Resume uploaded successfully",
            "Basic information captured"
        ],
        "gaps": [
            "Unable to perform detailed analysis due to processing error",
            "Consider reformatting your resume for better parsing"
        ],
        "keyword_analysis": {
            "matched_keywords": [],
            "missing_keywords": []
        },
        "recommendations": [
            "Ensure your resume is in a clean, standard format (PDF or DOCX)",
            "Use clear section headings (Experience, Skills, Education)",
            "Include relevant keywords from the job description",
            "Retake the analysis for better results"
        ],
        "section_scores": {
            "skills": 50,
            "experience": 50,
            "education": 50,
            "formatting": 50
        }
    }
