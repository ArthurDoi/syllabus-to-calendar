"""
Shared helpers for Google Calendar API interactions.
Used by both calendar.py router and events.py router.
"""
from datetime import datetime, timedelta, timezone
import logging

import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import GoogleCalendarSync

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"


def now_utc() -> datetime:
    """Trả về datetime UTC có timezone info (offset-aware)."""
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime | None) -> datetime | None:
    """Nếu datetime là offset-naive (không có tzinfo), gán UTC cho nó."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def to_google_datetime(dt: datetime | None) -> str | None:
    """Chuyển datetime sang chuỗi RFC3339 mà Google API chấp nhận."""
    if dt is None:
        return None
    dt = ensure_aware(dt)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


async def get_valid_google_token(sync: GoogleCalendarSync, db: AsyncSession) -> str:
    """Tự động refresh Google access token nếu hết hạn."""
    expires_at = ensure_aware(sync.token_expires_at)
    if expires_at and expires_at > now_utc() + timedelta(minutes=5):
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
        error_code = data.get("error", "")
        logger.error("Google token refresh failed: %s", data)
        if error_code in ("invalid_grant", "insufficient_scope", "unauthorized_client"):
            await db.delete(sync)
            await db.commit()
            raise HTTPException(
                status_code=401,
                detail=(
                    "Quyền truy cập Google Calendar đã hết hạn hoặc không đủ. "
                    "Vui lòng ngắt kết nối và kết nối lại Google Calendar."
                ),
            )
        raise HTTPException(
            status_code=401,
            detail=f"Không thể làm mới token Google: {data.get('error_description', data.get('error', 'unknown'))}",
        )

    sync.access_token = new_token
    expires_in = data.get("expires_in", 3600)
    sync.token_expires_at = now_utc() + timedelta(seconds=expires_in)
    await db.commit()
    return new_token


async def delete_google_calendar_event(
    google_event_id: str,
    sync: GoogleCalendarSync,
    db: AsyncSession,
) -> None:
    """
    Xóa một event khỏi Google Calendar qua API.
    Bỏ qua nếu event đã bị xóa trước đó (404).
    """
    access_token = await get_valid_google_token(sync, db)
    calendar_id = sync.calendar_id or "primary"
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{GOOGLE_CALENDAR_BASE}/calendars/{calendar_id}/events/{google_event_id}",
            headers=headers,
        )

    if resp.status_code == 204:
        logger.info("Deleted Google Calendar event %s", google_event_id)
    elif resp.status_code == 404:
        # Event đã bị xóa tay trên Google Calendar → bỏ qua
        logger.warning("Google Calendar event %s not found (already deleted)", google_event_id)
    else:
        logger.error(
            "Failed to delete Google Calendar event %s: %s %s",
            google_event_id,
            resp.status_code,
            resp.text,
        )
