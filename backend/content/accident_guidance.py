from typing import List

GUIDANCE_BY_COUNTRY = {
    "IN": [
        "Call 108 for ambulance and 112 for police — do this immediately.",
        "Do not move injured people unless they are in immediate danger (fire, traffic).",
        "Turn on hazard lights and set up warning triangles if you have them.",
        "Keep the scene as stable as possible for emergency responders.",
        "If someone is unconscious but breathing, place them in the recovery position.",
        "Note vehicle positions and take photos only if it is safe to do so.",
    ],
    "US": [
        "Call 911 immediately — one number for police, fire, and ambulance.",
        "Do not move injured people unless they are in immediate danger.",
        "Turn on hazard lights and stay clear of traffic if possible.",
        "Apply pressure to serious bleeding with a clean cloth if trained to do so.",
        "Stay on the line with dispatch until help arrives.",
    ],
    "GB": [
        "Call 999 for police, ambulance, or fire.",
        "Do not move injured people unless they are in immediate danger.",
        "Turn on hazard lights and keep the scene safe for other road users.",
        "If trained, provide first aid — otherwise wait for professionals.",
        "Give dispatch your exact location and number of casualties.",
    ],
    "DEFAULT": [
        "Call your local emergency number immediately (112 in most of Europe).",
        "Do not move injured people unless they are in immediate danger.",
        "Turn on hazard lights and make the scene visible to other drivers.",
        "Stay calm and keep talking to anyone who is conscious.",
        "Wait for professional help before attempting complex first aid.",
    ],
}


def get_guidance(country_code: str, intent: str = "accident_mode") -> List[str]:
    code = (country_code or "IN").upper()
    if code not in GUIDANCE_BY_COUNTRY:
        code = "DEFAULT"
    return GUIDANCE_BY_COUNTRY[code]
