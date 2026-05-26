# RoadSoS Android App

Native Kotlin + Jetpack Compose client for the RoadSoS FastAPI backend. Mirrors the web app: chat, accident mode, map, country emergency numbers, share location, and offline SOS card.

## Prerequisites

- Android Studio Ladybug (2024.2+) or newer
- JDK 17
- Android SDK 35
- Running backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000` from `backend/`
- Google Maps SDK API key (Maps SDK for Android enabled in Google Cloud Console)

## Setup

1. Open the **`app/`** folder in Android Studio (File → Open → select `app` directory).

2. Copy config:
   ```bash
   cp local.properties.example local.properties
   ```

3. Edit `local.properties`:
   ```properties
   sdk.dir=C\:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
   MAPS_API_KEY=your_google_maps_key
   API_BASE_URL=http://10.0.2.2:8000
   WEB_SHARE_BASE=http://10.0.2.2:5173
   ```

### API URL by device

| Device | `API_BASE_URL` |
|--------|----------------|
| Android Emulator | `http://10.0.2.2:8000` |
| Physical phone (same Wi‑Fi as laptop) | `http://YOUR_LAN_IP:8000` e.g. `http://192.168.1.5:8000` |

Backend must listen on `0.0.0.0`, not only `127.0.0.1`.

## Build and run

```bash
cd app
./gradlew :mobile:assembleDebug
```

Install on emulator/device from Android Studio **Run** (▶) on the `mobile` configuration.

## Demo script

1. Grant location when prompted → map overlay shows country numbers (108/112 in India).
2. Type **"I just had an accident"** → grouped hospital, ambulance, police, tow results + map markers.
3. Tap **SOS** FAB → dialer opens with ambulance number.
4. **Share location** → sends web link `…/emergency?lat=…&lng=…`.
5. **SOS Card** → view/share cached offline numbers after one online search.

## Deep links

- `roadsos://emergency?lat=12.97&lng=77.59`
- `https://roadsos.app/emergency?lat=12.97&lng=77.59` (when deployed)

## Project layout

```text
app/
├── mobile/          # Android application module
│   └── src/main/java/com/roadsos/
│       ├── data/    # Retrofit API, repository, DataStore
│       └── ui/      # Compose screens
└── settings.gradle.kts
```

## Git branch

Android work lives on branch **`app`**, not `main`.
