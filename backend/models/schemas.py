from pydantic import BaseModel, Field
from typing import List, Optional

class LocationRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the user")
    lng: float = Field(..., description="Longitude of the user")
    radius_km: float = Field(5.0, description="Search radius in kilometers")
    types: Optional[List[str]] = Field(None, description="List of service types (e.g., 'hospital', 'police')")

class ServiceResponse(BaseModel):
    id: int
    name: str
    type: str
    lat: float
    lng: float
    distance_meters: float
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True

class NearbyResponse(BaseModel):
    total_found: int
    services: List[ServiceResponse]
