# AI Tutor Module - Career guidance and interview prep chat
import logging
from typing import List, Dict, Any

def chat_with_ai_tutor(groq_client, messages: List[Dict[str, str]], model: str = "llama-3.1-8b-instant") -> str:
    """
    Chat with AI Tutor using latest Groq model
    Returns assistant's response
    """
    try:
        response = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        logging.error(f"AI Tutor chat error: {type(e).__name__}: {str(e)}")
        raise Exception("Failed to get response from AI Tutor")
