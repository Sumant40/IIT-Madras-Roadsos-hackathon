import logging
from fastapi import APIRouter, HTTPException

from services.geocode import GeocodingError, geocode_place

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/geocode",
    tags=["Geocoding"]
)

@router.get("/")
def geocode_text(q: str):
    """
    Converts an India location name into latitude and longitude using Nominatim.
    """
    try:
        return geocode_place(q)
    except GeocodingError as e:
        logger.error("Geocoding error: %s", e)
        raise HTTPException(status_code=404, detail=str(e))
