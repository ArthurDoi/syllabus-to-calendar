import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.security import get_current_user
from app.database import get_db
from app.models import Event, User
from app.schemas import EventCreate, EventUpdate, EventResponse, MessageResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=list[EventResponse])
async def list_events(
    course_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [Event.user_id == current_user.id]
    if course_id:
        filters.append(Event.course_id == course_id)
    if status:
        filters.append(Event.status == status)

    result = await db.execute(
        select(Event).where(and_(*filters)).order_by(Event.start_time)
    )
    return result.scalars().all()


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = Event(user_id=current_user.id, **body.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", response_model=MessageResponse)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    return MessageResponse(message="Event deleted")