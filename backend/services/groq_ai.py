import json
import logging
import re
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
from services.emergency_numbers import ACCIDENT_SERVICE_TYPES

logger = logging.getLogger(__name__)

ACCIDENT_PATTERN = re.compile(
    r"\b(accident|crash|collision|hit\s+(a\s+)?(car|someone)|wreck|road\s*accident)\b",
    re.IGNORECASE,
)

SYSTEM_PROMPT = """You are RoadSoS, an emergency road safety assistant.
Your goal is to parse user distress messages to determine if they need nearby services.

Respond ONLY with a valid JSON object matching this schema:
{
  "intent": "find_service" | "accident_mode" | "general_help" | "panic",
  "service_type": "ambulance" | "police" | "hospital" | "towing" | "fire_station" | null,
  "service_types": ["hospital", "ambulance", "police", "towing"] | null,
  "location_text": "string (extract location name if mentioned, else null)",
  "urgent": boolean,
  "response_message": "A warm, calm, directive response addressing the user (1-2 sentences max)"
}

Rules:
- Use intent "accident_mode" when the user reports a crash, accident, or needs ALL emergency services at once.
- For accident_mode, set service_types to ["hospital", "ambulance", "police", "towing"] and service_type to null.
- For a single service request, use find_service with one service_type.

Example 1:
User: "I'm near Velachery, need an ambulance!"
Output: {"intent": "find_service", "service_type": "ambulance", "service_types": null, "location_text": "Velachery", "urgent": true, "response_message": "Stay calm, I am pulling up the nearest ambulances around Velachery for you right now."}

Example 2:
User: "I just had an accident near IIT Madras"
Output: {"intent": "accident_mode", "service_type": null, "service_types": ["hospital", "ambulance", "police", "towing"], "location_text": "IIT Madras", "urgent": true, "response_message": "Stay calm. I am showing the nearest hospital, ambulance, police, and tow services on your map right now."}

Example 3:
User: "What should I do after a minor crash?"
Output: {"intent": "general_help", "service_type": null, "service_types": null, "location_text": null, "urgent": false, "response_message": "Move your vehicle to the side if possible, turn on hazard lights, and take photos of the damage."}
"""


def apply_accident_fallback(message: str, result: dict) -> dict:
    if result.get("intent") == "accident_mode":
        return result
    if ACCIDENT_PATTERN.search(message):
        return {
            **result,
            "intent": "accident_mode",
            "service_type": None,
            "service_types": ACCIDENT_SERVICE_TYPES,
            "urgent": True,
            "response_message": (
                result.get("response_message")
                or "Stay calm. I am showing the nearest hospital, ambulance, police, and tow services on your map right now."
            ),
        }
    return result


def detect_intent(message: str) -> dict:
    print(f"[DEBUG] GROQ_API_KEY loaded: {'YES (' + GROQ_API_KEY[:8] + '...)' if GROQ_API_KEY else 'NO'}")
    print(f"[DEBUG] GROQ_MODEL: {GROQ_MODEL}")

    if ACCIDENT_PATTERN.search(message):
        fallback = {
            "intent": "accident_mode",
            "service_type": None,
            "service_types": ACCIDENT_SERVICE_TYPES,
            "location_text": None,
            "urgent": True,
            "response_message": "Stay calm. I am showing the nearest hospital, ambulance, police, and tow services on your map right now.",
        }
    else:
        fallback = {
            "intent": "find_service",
            "service_type": "hospital",
            "service_types": None,
            "location_text": None,
            "urgent": True,
            "response_message": "API key missing, but here are nearby hospitals.",
        }

    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        logger.warning("Groq API key missing. Returning fallback intent.")
        return apply_accident_fallback(message, fallback)

    try:
        client = Groq(api_key=GROQ_API_KEY)

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            model=GROQ_MODEL,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        response_content = chat_completion.choices[0].message.content
        print(f"[DEBUG] Groq response: {response_content}")
        result = json.loads(response_content)
        return apply_accident_fallback(message, result)

    except Exception as e:
        print(f"[ERROR] Groq API call failed: {type(e).__name__}: {e}")
        logger.error(f"Groq API error: {e}")
        return apply_accident_fallback(message, {
            "intent": "error",
            "service_type": None,
            "service_types": None,
            "location_text": None,
            "urgent": False,
            "response_message": f"Groq error: {str(e)}",
        })
