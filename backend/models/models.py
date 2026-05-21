from sqlalchemy import Column, Integer, String, Float, DateTime, func
from geoalchemy2 import Geography
from .database import Base

class ServiceLocation(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    osm_id = Column(String, unique=True, index=True, nullable=True) # ID from Overpass or Places
    name = Column(String, nullable=False)
    type = Column(String, index=True, nullable=False) # e.g., 'hospital', 'police', 'ambulance', 'towing'
    phone = Column(String, nullable=True)
    
    # Store exact lat/lng for easy return mapping
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    
    # PostGIS Geography type for precise distance calculation in meters
    geom = Column(Geography(geometry_type='POINT', srid=4326, spatial_index=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
