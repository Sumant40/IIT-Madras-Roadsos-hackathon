import logging
from typing import Dict

import requests

logger = logging.getLogger(__name__)

REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "RoadSoS-Hackathon-App/1.0"


def reverse_geocode(lat: float, lng: float) -> Dict:
    """Resolve country from coordinates using Nominatim reverse geocoding."""
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": 1,
        "zoom": 3,
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(
            REVERSE_URL,
            params=params,
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.error("Reverse geocoding failed: %s", exc)
        return {
            "country_code": "IN",
            "country_name": "India",
        }

    address = data.get("address", {})
    country_code = (address.get("country_code") or "in").upper()
    country_name = address.get("country") or "Unknown"

    return {
        "country_code": country_code,
        "country_name": country_name,
    }
