from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.incidents import router as incidents_router
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.groups import router as groups_router

app = FastAPI(
    title="DevPulse API",
    description="Incident Management System API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://devpulse-red.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Administration"])
app.include_router(
    groups_router,
    prefix="/api/v1/groups",
    tags=["Groups"],
)
