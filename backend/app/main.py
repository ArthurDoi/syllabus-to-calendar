


from . import models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, courses, events, syllabus, calendar
from . database import get_db, engine




app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Syllabus -> lịch trình",
)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
PREFIX = "/api/v1"

app.include_router(auth.router,     prefix=PREFIX)
app.include_router(courses.router,  prefix=PREFIX)
app.include_router(events.router,   prefix=PREFIX)
app.include_router(syllabus.router, prefix=PREFIX)
app.include_router(calendar.router, prefix=PREFIX)


@app.get("/")
async def root():
    return {"status": "ok"}