from datetime import datetime, timedelta, timezone
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
from app.services.google_calendar_service import (
    GOOGLE_CALENDAR_BASE,
    delete_google_calendar_event,
    ensure_aware,
    get_valid_google_token,
    now_utc,
    to_google_datetime,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["Calendar"])

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


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
    access_token = await get_valid_google_token(sync, db)

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
            start_str = to_google_datetime(event.start_time)
            end_str = to_google_datetime(
                event.end_time or (
                    ensure_aware(event.start_time) + timedelta(hours=1)
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
                err_msg = err_detail.get('error', {})
                err_status = err_msg.get('status', '') if isinstance(err_msg, dict) else ''
                err_message = err_msg.get('message', resp.status_code) if isinstance(err_msg, dict) else str(err_msg)
                logger.warning("Failed to sync event '%s': %s %s", event.title, resp.status_code, err_detail)
                # 403 FORBIDDEN với insufficient scope → xóa sync record, buộc user kết nối lại
                if resp.status_code == 403 and (
                    'insufficient' in err_message.lower()
                    or err_status in ('PERMISSION_DENIED',)
                ):
                    await db.commit()  # lưu events đã sync được trước đó
                    await db.delete(sync)
                    await db.commit()
                    logger.warning("Deleted GoogleCalendarSync for user %s due to insufficient scope", current_user.id)
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            "Google Calendar không đủ quyền ghi lịch (insufficientPermissions). "
                            "Kết nối Google Calendar đã bị xóa. "
                            "Vui lòng vào trang Calendar và bấm 'Kết nối Google Calendar' để cấp lại đầy đủ quyền."
                        ),
                    )
                errors.append(f"{event.title}: {err_message}")

    sync.last_synced_at = now_utc()
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