import requests
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

OVERPASS_URL = "http://overpass-api.de/api/interpreter"

def get_bbox(lat: float, lng: float, radius_km: float):
    # Rough approximation for bounding box: 1 deg ~ 111km
    delta = radius_km / 111.0
    min_lat, max_lat = lat - delta, lat + delta
    
    # Longitude shrinks by cos(lat)
    import math
    delta_lng = delta / math.cos(math.radians(lat))
    min_lng, max_lng = lng - delta_lng, lng + delta_lng
    
    return f"{min_lat},{min_lng},{max_lat},{max_lng}"

def fetch_emergency_services(lat: float, lng: float, radius_km: float = 10.0) -> List[Dict]:
    """
    Fetches emergency services from OpenStreetMap using the Overpass API.
    Returns a list of parsed locations.
    """
    bbox = get_bbox(lat, lng, radius_km)
    
    # Overpass QL Query
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"hospital|clinic|police|fire_station"]({bbox});
      node["emergency"~"ambulance_station"]({bbox});
      node["shop"~"car_repair|tyres"]({bbox});
      
      way["amenity"~"hospital|clinic|police|fire_station"]({bbox});
    );
    out center;
    """
    
    try:
        headers = {
            "User-Agent": "RoadSoS-Hackathon/1.0",
            "Accept": "application/json"
        }
        response = requests.post(OVERPASS_URL, data={'data': query}, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            
            # Determine mapping type
            service_type = "unknown"
            if "amenity" in tags:
                am = tags["amenity"]
                if am in ["hospital", "clinic"]: service_type = "hospital"
                elif am == "police": service_type = "police"
                elif am == "fire_station": service_type = "fire_station"
            elif "emergency" in tags and tags["emergency"] == "ambulance_station":
                service_type = "ambulance"
            elif "shop" in tags:
                service_type = "towing" # Mapping repair/tyre shops as towing/repair
                
            # Get coordinates (ways return 'center' with our query)
            el_lat = element.get("lat") or (element.get("center", {}).get("lat"))
            el_lng = element.get("lon") or (element.get("center", {}).get("lon"))
            
            name = tags.get("name", tags.get("name:en", "Unknown Service"))
            phone = tags.get("phone", tags.get("contact:phone", None))
            
            if el_lat and el_lng:
                results.append({
                    "osm_id": f"{element['type']}/{element['id']}",
                    "name": name,
                    "type": service_type,
                    "lat": float(el_lat),
                    "lng": float(el_lng),
                    "phone": phone
                })
        return results
    except Exception as e:
        logger.error(f"Error fetching from Overpass: {e}")
        return []
