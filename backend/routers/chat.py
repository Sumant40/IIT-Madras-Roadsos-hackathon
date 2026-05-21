from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from services.groq_ai import detect_intent
from services.emergency_numbers import ACCIDENT_SERVICE_TYPES
from services.reverse_geocode import reverse_geocode
from content.accident_guidance import get_guidance
from services.geocode import geocode_place, GeocodingError

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
    guidance: Optional[List[str]] = None

@router.post("/", response_model=ChatResponse)
def handle_chat(req: ChatRequest):
    """
    Handles natural language queries, detects intent using Groq LLaMA 3,
    and returns a structured response.
    """
    intent_data = detect_intent(req.message)
    intent = intent_data.get("intent", "unknown")
    is_accident = intent == "accident_mode"

    action = {
        "service_type": intent_data.get("service_type"),
        "service_types": intent_data.get("service_types") or (ACCIDENT_SERVICE_TYPES if is_accident else None),
        "search_lat": req.user_lat,
        "search_lng": req.user_lng,
        "urgent": intent_data.get("urgent", False),
        "accident_mode": is_accident,
    }

    location_text = intent_data.get("location_text")
    if location_text:
        try:
            geo_res = geocode_place(location_text)
            action["search_lat"] = geo_res["lat"]
            action["search_lng"] = geo_res["lng"]
        except GeocodingError:
            pass

    guidance = None
    if is_accident or intent == "general_help":
        lat = action.get("search_lat")
        lng = action.get("search_lng")
        country_code = "IN"
        if lat is not None and lng is not None:
            geo = reverse_geocode(lat, lng)
            country_code = geo["country_code"]
        guidance = get_guidance(country_code, intent)

    return ChatResponse(
        intent=intent,
        message=intent_data.get("response_message", "I didn't quite catch that."),
        suggested_action=action,
        guidance=guidance,
    )
