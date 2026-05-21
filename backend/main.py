from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers import emergency, chat, geocode

app = FastAPI(
    title="RoadSoS API",
    description="Emergency services locator for road safety",
    version="1.0.0"
)

# Allow React frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emergency.router)
app.include_router(chat.router)
app.include_router(geocode.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "RoadSoS API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
