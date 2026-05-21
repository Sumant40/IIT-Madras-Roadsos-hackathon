# RoadSoS - Emergency Services Locator

RoadSoS is an AI-assisted road emergency web app built for the IIT Madras Road Safety Hackathon. It helps users find nearby emergency services from a natural language message such as:

```text
I need a hospital near IIT Madras Chennai
```

The app extracts the needed service and location, geocodes the place in India, fetches nearby services, displays them on a map, and provides call or directions actions.

## Features

- AI chatbot for accident and emergency requests.
- India place-name geocoding with Nominatim.
- Nearby emergency service search with PostgreSQL/PostGIS.
- On-demand OpenStreetMap Overpass fetch and local database caching.
- Emergency hospital filtering to reduce irrelevant clinics and specialty facilities.
- Interactive Leaflet map with result selection, marker popups, and Google Maps directions.
- SOS button that directly dials `112`, India's national emergency number.
- Mobile-friendly Chat/Map tabs at small widths.
- Loading skeleton cards during fetches.
- Light/dark theme toggle with saved preference.
- Keyboard-focusable controls and ARIA labels.
- PWA service worker for cached emergency API responses.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Leaflet, react-leaflet, Axios, lucide-react |
| Backend | FastAPI, SQLAlchemy, GeoAlchemy2 |
| Database | PostgreSQL + PostGIS |
| AI | Groq LLaMA model for intent detection |
| Geocoding | Nominatim / OpenStreetMap |
| Service Data | OpenStreetMap Overpass API, optional Google Places fallback |
| Infra | Docker Compose |

## Project Structure

```text
.
├── backend/
│   ├── init_db.py
│   ├── main.py
│   ├── config_example.py
│   ├── models/
│   ├── routers/
│   └── services/
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       └── components/
├── docker-compose.yml
└── README.md
```

## Setup

### 1. Start PostGIS

From the project root:

```powershell
docker compose up -d
```

The database runs on local port `5433`.

### 2. Configure Backend

Create your private backend config from the example:

```powershell
Copy-Item backend\config_example.py backend\config.py
```

Then edit `backend/config.py` and add your keys:

```python
GROQ_API_KEY = "your_groq_api_key"
GOOGLE_PLACES_API_KEY = "optional_google_places_key"
DATABASE_URL = "postgresql://roadsos:roadsos_password@localhost:5433/roadsos_db"
```

`backend/config.py` and `backend/.env` are intentionally ignored by Git.

### 3. Install Backend Dependencies

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If you do not already have the virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Initialize Tables and Optionally Seed a Place

```powershell
python init_db.py "IIT Madras Chennai" --radius-km 15 --types hospital police ambulance
```

You can seed any India place:

```powershell
python init_db.py "Connaught Place Delhi" --radius-km 10 --types hospital police towing
```

Available service types:

```text
hospital, police, ambulance, fire_station, towing
```

The app can also fetch and cache new nearby services on demand when a chatbot search reaches an unseeded place.

### 5. Start Backend

From `backend/`:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Useful backend URLs:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

### 6. Start Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Common Workflow

1. Start Docker database.
2. Start backend on port `8000`.
3. Start frontend on port `5173`.
4. Ask the chatbot for help, for example:

```text
show hospitals near Velachery
```

```text
I had an accident near IIT Madras Chennai and need an ambulance
```

5. Select a result on the map or in the results list.
6. Use `Directions` to open Google Maps navigation or `Call` where a phone number exists.
7. Use the SOS button to dial `112`.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Backend health check |
| `POST` | `/chat/` | Parse natural language emergency request |
| `GET` | `/geocode/?q=Velachery` | Convert an India place name to coordinates |
| `POST` | `/emergency/nearby` | Find nearby services by coordinates and type |

Example nearby request:

```powershell
curl -X POST http://localhost:8000/emergency/nearby `
  -H "Content-Type: application/json" `
  -d '{
    "lat": 12.9716,
    "lng": 77.5946,
    "radius_km": 10,
    "types": ["hospital"]
  }'
```

## Notes

- Emergency hospital results intentionally filter out many routine clinics and specialty facilities, such as dental, skin, eye, fertility, physiotherapy, and veterinary clinics.
- Directions use Google Maps URL navigation and include the user's browser geolocation as origin when available.
- The frontend can run without a backend for layout preview, but chatbot searches require the FastAPI server.
- The SOS link uses `tel:112`; desktop browsers may show a handler prompt, while mobile browsers can open the phone dialer.

## License

MIT
