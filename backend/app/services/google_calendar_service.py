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
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def to_google_datetime(dt: datetime | None) -> str | None:
    """Change datetime to RFC3339 string that Google API accepts."""
    if dt is None:
        return None
    dt = ensure_aware(dt)
    return dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


async def get_valid_google_token(sync: GoogleCalendarSync, db: AsyncSession) -> str:
    """Auto refresh Google access token if expired."""
    expires_at = ensure_aware(sync.token_expires_at)
    if expires_at and expires_at > now_utc() + timedelta(minutes=5):
        return sync.access_token

    if not sync.refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Google Calendar not connected. Please connect again.",
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
                    "Google Calendar access permission has expired or is insufficient. "
                    "Please disconnect and reconnect Google Calendar."
                ),
            )
        raise HTTPException(
            status_code=401,
            detail=f"Failed to refresh Google token: {data.get('error_description', data.get('error', 'unknown'))}",
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
    Delete an event from Google Calendar via API.
    Ignore if the event has been deleted before (404).
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
        logger.warning("Google Calendar event %s not found (already deleted)", google_event_id)
    else:
        logger.error(
            "Failed to delete Google Calendar event %s: %s %s",
            google_event_id,
            resp.status_code,
            resp.text,
        )
