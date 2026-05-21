from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.groq_ai import detect_intent
from routers.geocode import geocode_text

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"]
)

class ChatRequest(BaseModel):
    message: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

class ChatResponse(BaseModel):
    intent: str
    message: str
    suggested_action: dict

@router.post("/", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    """
    Handles natural language queries, detects intent using Groq LLaMA 3,
    and returns a structured response.
    """
    # 1. Detect intent via Groq
    intent_data = detect_intent(req.message)
    
    # 2. Formulate action
    action = {
        "service_type": intent_data.get("service_type"),
        "search_lat": req.user_lat,
        "search_lng": req.user_lng,
        "urgent": intent_data.get("urgent", False)
    }
    
    # If the user mentioned a specific location instead of current GPS
    location_text = intent_data.get("location_text")
    if location_text:
        try:
            # Reusing the logic from geocode.py (we call the endpoint function directly here)
            geo_res = geocode_text(location_text)
            action["search_lat"] = geo_res["lat"]
            action["search_lng"] = geo_res["lng"]
        except Exception:
            pass # fallback to user's gps if geocode fails
            
    return ChatResponse(
        intent=intent_data.get("intent", "unknown"),
        message=intent_data.get("response_message", "I didn't quite catch that."),
        suggested_action=action
    )
