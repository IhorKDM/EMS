from fastapi import FastAPI

from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version
)

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": settings.app_version}