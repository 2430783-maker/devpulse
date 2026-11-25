from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.incidents import router as incidents_router
from app.routes.auth import router as auth_router

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


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(
    incidents_router,
    prefix="/api/v1/incidents",
    tags=["Incidents"],
)

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)
