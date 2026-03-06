from datetime import datetime, timedelta, timezone
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.core.config import settings
from app.core.security import get_current_user
from app.database import get_db
from app.models import CalendarEvent, Event, GoogleCalendarSync, User
from app.schemas import (
    CalendarEventResponse,
    GoogleSyncStatusResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["Calendar"])

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"


def _now_utc() -> datetime:
    """Trả về datetime UTC có timezone info (offset-aware)."""
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime | None) -> datetime | None:
    """Nếu datetime là offset-naive (không có tzinfo), gán UTC cho nó."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _to_google_datetime(dt: datetime | None) -> str | None:
    """Chuyển datetime sang chuỗi RFC3339 mà Google API chấp nhận."""
    if dt is None:
        return None
    dt = _ensure_aware(dt)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


# ── Helpers
async def _get_valid_google_token(sync: GoogleCalendarSync, db: AsyncSession) -> str:
    """Tự động refresh Google access token nếu hết hạn."""
    expires_at = _ensure_aware(sync.token_expires_at)
    if expires_at and expires_at > _now_utc() + timedelta(minutes=5):
        return sync.access_token

    if not sync.refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Google Calendar không còn kết nối. Hãy kết nối lại.",
        )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": sync.refresh_token,
                "grant_type": "refresh_token",
            },
        )
    data = resp.json()
    new_token = data.get("access_token")
    if not new_token:
        logger.error("Google token refresh failed: %s", data)
        raise HTTPException(status_code=401, detail=f"Không thể làm mới token Google: {data.get('error_description', data.get('error', 'unknown'))}")

    sync.access_token = new_token
    expires_in = data.get("expires_in", 3600)
    sync.token_expires_at = _now_utc() + timedelta(seconds=expires_in)
    await db.commit()
    return new_token


async def _get_sync_record(user_id, db: AsyncSession) -> GoogleCalendarSync:
    result = await db.execute(
        select(GoogleCalendarSync).where(GoogleCalendarSync.user_id == user_id)
    )
    sync = result.scalar_one_or_none()
    if not sync:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar chưa được kết nối. Hãy bấm 'Kết nối Google Calendar'.",
        )
    return sync


# ── Status
@router.get("/status", response_model=GoogleSyncStatusResponse)
async def sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GoogleCalendarSync).where(GoogleCalendarSync.user_id == current_user.id)
    )
    sync = result.scalar_one_or_none()
    return GoogleSyncStatusResponse(
        connected=sync is not None,
        calendar_id=sync.calendar_id if sync else None,
        last_synced_at=sync.last_synced_at if sync else None,
    )


# ── Sync tất cả events lên Google Calendar
@router.post("/sync", response_model=MessageResponse)
async def sync_events_to_google(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sync = await _get_sync_record(current_user.id, db)
    access_token = await _get_valid_google_token(sync, db)

    # Lấy tất cả events chưa được sync (chưa có bản ghi CalendarEvent tương ứng)
    result = await db.execute(
        select(Event, CalendarEvent)
        .outerjoin(CalendarEvent, CalendarEvent.event_id == Event.id)
        .where(
            Event.user_id == current_user.id,
            CalendarEvent.id.is_(None),   # chưa sync
            Event.start_time.is_not(None),  # phải có ngày
        )
    )
    rows = result.all()

    if not rows:
        return MessageResponse(message="Không có sự kiện mới để sync (tất cả đã được sync trước đó)")

    calendar_id = sync.calendar_id or "primary"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    synced = 0
    errors = []

    async with httpx.AsyncClient() as client:
        for event, _ in rows:
            start_str = _to_google_datetime(event.start_time)
            end_str = _to_google_datetime(
                event.end_time or (
                    _ensure_aware(event.start_time) + timedelta(hours=1)
                )
            )
            if not start_str:
                continue

            body = {
                "summary": event.title,
                "description": event.description or "",
                "start": {"dateTime": start_str, "timeZone": "Asia/Ho_Chi_Minh"},
                "end": {"dateTime": end_str, "timeZone": "Asia/Ho_Chi_Minh"},
            }

            resp = await client.post(
                f"{GOOGLE_CALENDAR_BASE}/calendars/{calendar_id}/events",
                json=body,
                headers=headers,
            )

            if resp.status_code in (200, 201):
                g_event = resp.json()
                cal_event = CalendarEvent(
                    user_id=current_user.id,
                    event_id=event.id,
                    google_event_id=g_event["id"],
                    title=event.title,
                    description=event.description,
                    start_date=event.start_time,
                    end_date=event.end_time,
                    event_type="course_deadline",
                )
                db.add(cal_event)
                synced += 1
            else:
                err_detail = resp.json()
                logger.warning("Failed to sync event '%s': %s %s", event.title, resp.status_code, err_detail)
                errors.append(f"{event.title}: {err_detail.get('error', {}).get('message', resp.status_code)}")

    sync.last_synced_at = _now_utc()
    await db.commit()

    msg = f"Đã sync {synced}/{len(rows)} sự kiện lên Google Calendar."
    if errors:
        msg += f" Lỗi ({len(errors)}): " + "; ".join(errors[:3])
    return MessageResponse(message=msg)


# ── List calendar events
@router.get("/events", response_model=list[CalendarEventResponse])
async def list_calendar_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.user_id == current_user.id)
        .order_by(CalendarEvent.start_date)
    )
    return result.scalars().all()


# ── Disconnect Google Calendar
@router.delete("/disconnect", response_model=MessageResponse)
async def disconnect_google(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sync = await _get_sync_record(current_user.id, db)
    await db.delete(sync)
    await db.commit()
    return MessageResponse(message="Google Calendar đã được ngắt kết nối")