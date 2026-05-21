import json
import logging
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are RoadSoS, an emergency road safety assistant for India.
Your goal is to parse user distress messages to determine if they need nearby services.

Respond ONLY with a valid JSON object matching this schema:
{
  "intent": "find_service" | "general_help" | "panic",
  "service_type": "ambulance" | "police" | "hospital" | "towing" | "fire_station" | null,
  "location_text": "string (extract location name if mentioned, else null)",
  "urgent": boolean,
  "response_message": "A warm, calm, directive response addressing the user (1-2 sentences max)"
}

Example 1:
User: "I'm near Velachery, need an ambulance!"
Output: {"intent": "find_service", "service_type": "ambulance", "location_text": "Velachery", "urgent": true, "response_message": "Stay calm, I am pulling up the nearest ambulances around Velachery for you right now."}

Example 2:
User: "What should I do after a minor crash?"
Output: {"intent": "general_help", "service_type": null, "location_text": null, "urgent": false, "response_message": "Move your vehicle to the side if possible, turn on hazard lights, and take photos of the damage."}
"""

def detect_intent(message: str) -> dict:
    # Debug: print the key status on every call
    print(f"[DEBUG] GROQ_API_KEY loaded: {'YES (' + GROQ_API_KEY[:8] + '...)' if GROQ_API_KEY else 'NO'}")
    print(f"[DEBUG] GROQ_MODEL: {GROQ_MODEL}")
    
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        logger.warning("Groq API key missing. Returning dummy intent.")
        return {
            "intent": "find_service",
            "service_type": "hospital",
            "location_text": None,
            "urgent": True,
            "response_message": "API key missing, but here are nearby hospitals."
        }

    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
            model=GROQ_MODEL,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        response_content = chat_completion.choices[0].message.content
        print(f"[DEBUG] Groq response: {response_content}")
        return json.loads(response_content)
        
    except Exception as e:
        # Print the FULL error so we can see it in the terminal
        print(f"[ERROR] Groq API call failed: {type(e).__name__}: {e}")
        logger.error(f"Groq API error: {e}")
        return {
            "intent": "error",
            "service_type": None,
            "location_text": None,
            "urgent": False,
            "response_message": f"Groq error: {str(e)}"
        }
