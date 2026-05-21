import logging
from typing import Dict

import requests

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "RoadSoS-Hackathon-App/1.0"


class GeocodingError(Exception):
    """Raised when a place name cannot be converted into coordinates."""


def geocode_place(place: str) -> Dict:
    """
    Convert any India place name into latitude and longitude using Nominatim.
    """
    normalized_place = place.strip()
    if not normalized_place:
        raise GeocodingError("Location cannot be empty")

    params = {
        "q": normalized_place,
        "format": "json",
        "limit": 1,
        "countrycodes": "in",
        "addressdetails": 1,
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(
            NOMINATIM_URL,
            params=params,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.error("Geocoding request failed: %s", exc)
        raise GeocodingError("Could not contact geocoding service") from exc

    if not data:
        raise GeocodingError(f"Location not found in India: {normalized_place}")

    result = data[0]
    return {
        "lat": float(result["lat"]),
        "lng": float(result["lon"]),
        "display_name": result.get("display_name", normalized_place),
    }
