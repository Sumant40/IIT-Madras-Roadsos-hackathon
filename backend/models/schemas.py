from pydantic import BaseModel, Field
from typing import List, Optional

class LocationRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the user")
    lng: float = Field(..., description="Longitude of the user")
    radius_km: float = Field(5.0, description="Search radius in kilometers")
    types: Optional[List[str]] = Field(None, description="List of service types (e.g., 'hospital', 'police')")
    accident_mode: bool = Field(False, description="Return top N per service type for accident response")
    per_type_limit: Optional[int] = Field(None, description="Max results per type when accident_mode is true")

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

class EmergencyNumbers(BaseModel):
    police: str
    ambulance: str
    fire: Optional[str] = None

class CountryEmergencyResponse(BaseModel):
    country_code: str
    country_name: str
    numbers: EmergencyNumbers
