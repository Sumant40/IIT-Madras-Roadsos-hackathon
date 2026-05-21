import sys
import os
import argparse
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.models.database import engine, Base, SessionLocal
from backend.models.models import ServiceLocation
from backend.services.geocode import GeocodingError, geocode_place
from backend.services.overpass import fetch_emergency_services


DEFAULT_TYPES = ["hospital"]


def init_db():
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

def seed_location(
    db: Session,
    label: str,
    lat: float,
    lng: float,
    radius_km: float = 15.0,
    service_types=None,
):
    requested_types = set(service_types or DEFAULT_TYPES)
    print(f"\nFetching {', '.join(sorted(requested_types))} near {label} (radius: {radius_km}km)...")
    services = fetch_emergency_services(lat, lng, radius_km)
    services = [s for s in services if s["type"] in requested_types]
    print(f"Found {len(services)} matching services near {label}.")
    
    added = 0
    for s in services:
        # Check if exists
        exists = db.query(ServiceLocation).filter(ServiceLocation.osm_id == s['osm_id']).first()
        if not exists:
            # Create WKT point for PostGIS (Format: POINT(lon lat))
            geom_wkt = f"SRID=4326;POINT({s['lng']} {s['lat']})"
            
            new_service = ServiceLocation(
                osm_id=s['osm_id'],
                name=s['name'],
                type=s['type'],
                lat=s['lat'],
                lng=s['lng'],
                phone=s['phone'],
                geom=geom_wkt
            )
            db.add(new_service)
            added += 1
            
    db.commit()
    print(f"Successfully seeded {added} new services for {label} into database.")


def seed_place(db: Session, place: str, radius_km: float = 15.0, service_types=None):
    print(f"\nResolving location in India: {place}")
    geo = geocode_place(place)
    print(f"Using: {geo['display_name']}")
    seed_location(
        db=db,
        label=geo["display_name"],
        lat=geo["lat"],
        lng=geo["lng"],
        radius_km=radius_km,
        service_types=service_types,
    )


def parse_args():
    parser = argparse.ArgumentParser(
        description="Seed emergency service data near any place in India."
    )
    parser.add_argument(
        "place_words",
        nargs="*",
        help='Place to search, for example: "Velachery" or "IIT Madras Chennai"',
    )
    parser.add_argument(
        "--place",
        help='Place to search, for example: --place "Velachery Chennai"',
    )
    parser.add_argument(
        "--radius-km",
        type=float,
        default=15.0,
        help="Search radius around the place in kilometers. Default: 15",
    )
    parser.add_argument(
        "--types",
        nargs="+",
        default=DEFAULT_TYPES,
        choices=["hospital", "police", "ambulance", "fire_station", "towing"],
        help="Service types to seed. Default: hospital",
    )
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    place = args.place or " ".join(args.place_words).strip()
    if not place:
        place = input("Enter any place in India to find nearby hospitals: ").strip()

    if not place:
        raise SystemExit("No place provided. Example: python backend/init_db.py --place \"Velachery\"")

    init_db()
    
    db = SessionLocal()
    try:
        seed_place(db, place, args.radius_km, args.types)
    except GeocodingError as e:
        raise SystemExit(str(e))
    finally:
        db.close()
    
    print("\nDatabase seeding complete! Data pipeline ready.")
