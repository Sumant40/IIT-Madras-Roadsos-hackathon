import json
from pathlib import Path
from typing import Dict

from models.schemas import CountryEmergencyResponse, EmergencyNumbers

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "emergency_numbers.json"

with _DATA_PATH.open(encoding="utf-8") as f:
    _NUMBERS_DB: Dict = json.load(f)

ACCIDENT_SERVICE_TYPES = ["hospital", "ambulance", "police", "towing"]


def get_emergency_numbers(country_code: str) -> CountryEmergencyResponse:
    code = (country_code or "IN").upper()
    entry = _NUMBERS_DB.get(code) or _NUMBERS_DB["DEFAULT"]
    country_name = entry.get("country_name", "International")

    if code in _NUMBERS_DB and code != "DEFAULT":
        country_name = _NUMBERS_DB[code].get("country_name", country_name)

    numbers = EmergencyNumbers(
        police=entry["police"],
        ambulance=entry["ambulance"],
        fire=entry.get("fire"),
    )

    return CountryEmergencyResponse(
        country_code=code if code in _NUMBERS_DB else "DEFAULT",
        country_name=country_name,
        numbers=numbers,
    )
