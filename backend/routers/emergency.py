from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, not_, or_
from geoalchemy2.functions import ST_GeogFromText
from sqlalchemy.sql import func

from models.database import get_db
from models.models import ServiceLocation
from models.schemas import (
    LocationRequest,
    NearbyResponse,
    ServiceResponse,
    CountryEmergencyResponse,
)
from services.overpass import fetch_emergency_services
from services.emergency_numbers import ACCIDENT_SERVICE_TYPES, get_emergency_numbers
from services.reverse_geocode import reverse_geocode

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency Services"]
)

NON_EMERGENCY_HOSPITAL_NAME_KEYWORDS = (
    "ayurveda",
    "ayurvedic",
    "clinic",
    "cosmetic",
    "dental",
    "derma",
    "eye",
    "fertility",
    "homeopathy",
    "ivf",
    "physio",
    "skin",
    "veterinary",
)


def apply_emergency_hospital_filter(query):
    specialty_name_match = or_(*[
        ServiceLocation.name.ilike(f"%{keyword}%")
        for keyword in NON_EMERGENCY_HOSPITAL_NAME_KEYWORDS
    ])

    return query.filter(not_(and_(
        ServiceLocation.type == "hospital",
        specialty_name_match,
    )))


def query_nearby_services(req: LocationRequest, db: Session, service_type=None):
    target_point = ST_GeogFromText(f'SRID=4326;POINT({req.lng} {req.lat})')
    radius_meters = req.radius_km * 1000
    distance_col = func.ST_Distance(ServiceLocation.geom, target_point).label('distance_meters')

    query = db.query(ServiceLocation, distance_col)
    query = query.filter(func.ST_DWithin(ServiceLocation.geom, target_point, radius_meters))

    types_filter = [service_type] if service_type else req.types
    if types_filter and len(types_filter) > 0:
        query = query.filter(ServiceLocation.type.in_(types_filter))

    if not types_filter or "hospital" in types_filter:
        query = apply_emergency_hospital_filter(query)

    query = query.order_by(ServiceLocation.geom.distance_centroid(target_point))
    limit = req.per_type_limit if req.accident_mode and req.per_type_limit else 50
    return query.limit(limit).all()


def cache_services_from_overpass(req: LocationRequest, db: Session):
    requested_types = set(req.types or ACCIDENT_SERVICE_TYPES)
    fetched_services = fetch_emergency_services(req.lat, req.lng, req.radius_km)
    added = 0

    for service in fetched_services:
        if requested_types and service["type"] not in requested_types:
            continue

        exists = db.query(ServiceLocation).filter(
            ServiceLocation.osm_id == service["osm_id"]
        ).first()
        if exists:
            continue

        geom_wkt = f"SRID=4326;POINT({service['lng']} {service['lat']})"
        db.add(ServiceLocation(
            osm_id=service["osm_id"],
            name=service["name"],
            type=service["type"],
            lat=service["lat"],
            lng=service["lng"],
            phone=service["phone"],
            geom=geom_wkt,
        ))
        added += 1

    if added:
        db.commit()

    return added


def to_nearby_response(results):
    services = []
    for loc, dist in results:
        services.append(
            ServiceResponse(
                id=loc.id,
                name=loc.name,
                type=loc.type,
                lat=loc.lat,
                lng=loc.lng,
                distance_meters=round(dist, 2),
                phone=loc.phone
            )
        )

    return NearbyResponse(
        total_found=len(services),
        services=services
    )


def fetch_accident_bundle(req: LocationRequest, db: Session):
    types = req.types or ACCIDENT_SERVICE_TYPES
    per_limit = req.per_type_limit or 2
    all_results = []

    for service_type in types:
        type_req = LocationRequest(
            lat=req.lat,
            lng=req.lng,
            radius_km=req.radius_km,
            types=[service_type],
            accident_mode=True,
            per_type_limit=per_limit,
        )
        results = query_nearby_services(type_req, db, service_type=service_type)
        all_results.extend(results)

    return all_results


def fetch_nearby_with_fallback(req: LocationRequest, db: Session):
    if req.accident_mode:
        results = fetch_accident_bundle(req, db)
        if not results:
            cache_services_from_overpass(req, db)
            results = fetch_accident_bundle(req, db)
        return results

    results = query_nearby_services(req, db)
    if not results:
        cache_services_from_overpass(req, db)
        results = query_nearby_services(req, db)
    return results


@router.get("/country", response_model=CountryEmergencyResponse)
def get_country_emergency(lat: float = Query(...), lng: float = Query(...)):
    """Return emergency phone numbers for the country at the given coordinates."""
    geo = reverse_geocode(lat, lng)
    return get_emergency_numbers(geo["country_code"])


@router.post("/nearby", response_model=NearbyResponse)
def get_nearby_services(req: LocationRequest, db: Session = Depends(get_db)):
    """
    Find emergency services near the given latitude and longitude.
    Uses the DB first, then fetches and caches fresh OpenStreetMap data on demand.
    When accident_mode is true, returns up to per_type_limit results per service type.
    """
    try:
        if req.accident_mode and not req.types:
            req = req.model_copy(update={"types": ACCIDENT_SERVICE_TYPES})
        if req.accident_mode and req.per_type_limit is None:
            req = req.model_copy(update={"per_type_limit": 2})

        results = fetch_nearby_with_fallback(req, db)
        return to_nearby_response(results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
