import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_current_user
from app.database import get_db
from app.models import CalendarEvent, Course, Event, GoogleCalendarSync, User
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, MessageResponse
from app.services.google_calendar_service import delete_google_calendar_event

router = APIRouter(prefix="/courses", tags=["Courses"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course)
        .where(Course.user_id == current_user.id)
        .order_by(Course.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = Course(user_id=current_user.id, **body.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    body: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get all events of this course
    events_result = await db.execute(
        select(Event).where(Event.course_id == course_id, Event.user_id == current_user.id)
    )
    events = events_result.scalars().all()

    if events:
        # Get Google Calendar sync record (if any)
        sync_result = await db.execute(
            select(GoogleCalendarSync).where(
                GoogleCalendarSync.user_id == current_user.id
            )
        )
        sync = sync_result.scalar_one_or_none()

        for event in events:
            # Check if event has been synced to Google Calendar
            cal_result = await db.execute(
                select(CalendarEvent).where(CalendarEvent.event_id == event.id)
            )
            cal_event = cal_result.scalar_one_or_none()

            if cal_event and cal_event.google_event_id and sync:
                try:
                    await delete_google_calendar_event(
                        google_event_id=cal_event.google_event_id,
                        sync=sync,
                        db=db,
                    )
                except Exception as exc:
                    logger.warning(
                        "Could not delete Google Calendar event %s: %s",
                        cal_event.google_event_id,
                        exc,
                    )

            if cal_event:
                await db.delete(cal_event)

    # Delete course (cascade delete remaining Events in DB)
    await db.delete(course)
    await db.commit()
    return MessageResponse(message="Course deleted")
