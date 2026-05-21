from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_GeogFromText
from sqlalchemy.sql import func

from models.database import get_db
from models.models import ServiceLocation
from models.schemas import LocationRequest, NearbyResponse, ServiceResponse
from services.overpass import fetch_emergency_services

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency Services"]
)


def query_nearby_services(req: LocationRequest, db: Session):
    target_point = ST_GeogFromText(f'SRID=4326;POINT({req.lng} {req.lat})')
    radius_meters = req.radius_km * 1000
    distance_col = func.ST_Distance(ServiceLocation.geom, target_point).label('distance_meters')

    query = db.query(ServiceLocation, distance_col)
    query = query.filter(func.ST_DWithin(ServiceLocation.geom, target_point, radius_meters))

    if req.types and len(req.types) > 0:
        query = query.filter(ServiceLocation.type.in_(req.types))

    query = query.order_by(ServiceLocation.geom.distance_centroid(target_point))
    return query.limit(50).all()


def cache_services_from_overpass(req: LocationRequest, db: Session):
    requested_types = set(req.types or [])
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


@router.post("/nearby", response_model=NearbyResponse)
def get_nearby_services(req: LocationRequest, db: Session = Depends(get_db)):
    """
    Find emergency services near the given latitude and longitude.
    Uses the DB first, then fetches and caches fresh OpenStreetMap data on demand.
    """
    try:
        results = query_nearby_services(req, db)

        if not results:
            cache_services_from_overpass(req, db)
            results = query_nearby_services(req, db)

        return to_nearby_response(results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
