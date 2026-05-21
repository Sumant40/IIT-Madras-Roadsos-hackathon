import requests
import logging
from typing import List, Dict
from config import GOOGLE_PLACES_API_KEY

logger = logging.getLogger(__name__)

PLACES_API_KEY = GOOGLE_PLACES_API_KEY

def fetch_places_services(lat: float, lng: float, radius_km: float = 10.0, service_type: str = "towing") -> List[Dict]:
    """
    Fallback method to fetch services (especially towing and repair) using Google Places API.
    """
    if not PLACES_API_KEY or PLACES_API_KEY == "your_google_places_api_key_here":
        logger.warning("Google Places API key not configured. Skipping fallback.")
        return []
        
    radius_meters = int(radius_km * 1000)
    
    # Map our type to Google Places type/keyword
    keyword_map = {
        "towing": "towing|car repair|mechanic|tyre puncture",
        "ambulance": "ambulance service"
    }
    
    keyword = keyword_map.get(service_type, service_type)
    
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius={radius_meters}&keyword={keyword}&key={PLACES_API_KEY}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for place in data.get("results", []):
            loc = place.get("geometry", {}).get("location", {})
            p_lat = loc.get("lat")
            p_lng = loc.get("lng")
            
            if p_lat and p_lng:
                results.append({
                    "osm_id": f"places/{place.get('place_id')}",
                    "name": place.get("name"),
                    "type": service_type,
                    "lat": float(p_lat),
                    "lng": float(p_lng),
                    # Phone requires a separate details call in Places API, skip for now to save quota
                    "phone": None 
                })
        return results
    except Exception as e:
        logger.error(f"Error fetching from Google Places: {e}")
        return []
