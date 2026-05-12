from contextlib import asynccontextmanager
from fastapi import FastAPI

import app.models
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, users

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(users.router)

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": settings.app_version}