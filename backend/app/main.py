from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

import app.models
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, users, admin, business, positions, schedule, payroll, holidays, logs

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """ Create all database tables on startup """
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(business.router)
app.include_router(positions.router)
app.include_router(schedule.router)
app.include_router(payroll.router)
app.include_router(holidays.router)
app.include_router(logs.router)

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": settings.app_version}