from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import initialize_database
from app.routes.incidents import router as incidents_router

app = FastAPI(
    title="DevPulse API",
    description="Incident Management System API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

initialize_database()

@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(
    incidents_router,
    prefix="/api/v1/incidents",
    tags=["Incidents"],
)
