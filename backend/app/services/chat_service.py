"""
Chat Service — Function Calling pattern with Gemini.

Flow:
  1. User send question
  2. Gemini nhận question + function declarations
  3. Gemini decide to call function (get_events, get_courses, ...)
  4. Backend execute DB query, return JSON result to Gemini
  5. Gemini summarize natural answer
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import UUID

from google import genai
from google.genai import types as gtypes
from sqlalchemy import select, and_, func, extract, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Course, Event

logger = logging.getLogger(__name__)


def _gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


# Function Declarations for Gemini

FUNCTION_DECLARATIONS = [
    gtypes.FunctionDeclaration(
        name="get_courses",
        description="Get all courses/subjects of the user. Return information: name, code, instructor, term, start date/end date.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_events",
        description="Get all events/schedules (lectures, assignments, exams, holidays, etc.) with optional filters. The label parameter accepts any value (exam, assignment, lecture, holiday, seminar, lab, project, etc.).",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={
                "course_id": gtypes.Schema(type="STRING", description="ID of the specific course (UUID). Only use when the exact course_id is known."),
                "label": gtypes.Schema(type="STRING", description="Event type: exam, assignment, lecture, holiday, seminar, lab, project, or any existing label. No value restrictions."),
                "month": gtypes.Schema(type="INTEGER", description="Month (1-12) to filter by start_time."),
                "week_number": gtypes.Schema(type="INTEGER", description="Week number in the teaching plan."),
                "status": gtypes.Schema(type="STRING", description="Status: pending, in-progress, completed."),
                "title_contains": gtypes.Schema(type="STRING", description="Search for events with titles containing this string (case-insensitive)."),
            },
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_upcoming_events",
        description="Get upcoming events in N days from today (default 7 days). Useful for questions like 'what's happening this week', 'what deadlines are coming up'.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={
                "days": gtypes.Schema(type="INTEGER", description="Number of days from today (default: 7)."),
            },
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_event_labels",
        description="Get all event labels (categories) that exist in the data. Helps to know what types of events exist (e.g., exam, lecture, assignment, holiday, ...).",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
    gtypes.FunctionDeclaration(
        name="sync_to_calendar",
        description="Request to sync all events not yet synced to Google Calendar. Only call when the user requests to sync/synchronize the calendar.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
]


# DB Query Functions

async def fn_get_courses(db: AsyncSession, user_id: UUID, **kwargs) -> list[dict]:
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
    )
    courses = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "code": c.code,
            "term": c.term,
            "instructor": c.instructor,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.end_date) if c.end_date else None,
        }
        for c in courses
    ]


async def fn_get_events(
    db: AsyncSession,
    user_id: UUID,
    *,
    course_id: str | None = None,
    label: str | None = None,
    month: int | None = None,
    week_number: int | None = None,
    status: str | None = None,
    title_contains: str | None = None,
    **kwargs,
) -> list[dict]:
    filters = [Event.user_id == user_id]

    if course_id:
        try:
            filters.append(Event.course_id == UUID(course_id))
        except ValueError:
            pass

    if label:
        filters.append(func.lower(Event.label) == label.lower())

    if month:
        filters.append(extract("month", Event.start_time) == month)

    if week_number:
        filters.append(Event.week_number == week_number)

    if status:
        filters.append(Event.status == status)

    if title_contains:
        filters.append(Event.title.ilike(f"%{title_contains}%"))

    result = await db.execute(
        select(Event).where(and_(*filters)).order_by(Event.start_time)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "title": e.title,
            "label": e.label,
            "description": e.description,
            "start_time": str(e.start_time) if e.start_time else None,
            "end_time": str(e.end_time) if e.end_time else None,
            "status": e.status,
            "week_number": e.week_number,
            "course_id": str(e.course_id) if e.course_id else None,
        }
        for e in events
    ]


async def fn_get_upcoming_events(
    db: AsyncSession,
    user_id: UUID,
    *,
    days: int = 7,
    **kwargs,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)

    result = await db.execute(
        select(Event).where(
            Event.user_id == user_id,
            Event.start_time.is_not(None),
            Event.start_time >= now,
            Event.start_time <= end,
        ).order_by(Event.start_time)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "title": e.title,
            "label": e.label,
            "description": e.description,
            "start_time": str(e.start_time) if e.start_time else None,
            "end_time": str(e.end_time) if e.end_time else None,
            "status": e.status,
            "week_number": e.week_number,
        }
        for e in events
    ]


async def fn_get_event_labels(db: AsyncSession, user_id: UUID, **kwargs) -> list[str]:
    result = await db.execute(
        select(func.distinct(Event.label))
        .where(Event.user_id == user_id, Event.label.is_not(None))
    )
    return [row[0] for row in result.all()]


async def fn_sync_to_calendar(db: AsyncSession, user_id: UUID, **kwargs) -> dict:
    """Return instructions — sync is actually performed via API endpoint."""
    return {
        "message": "To sync Google Calendar, please use the 'Sync' button on the Calendar interface. "
                   "I can help you check for unsynced events if needed."
    }


# Function Router

FUNCTION_MAP = {
    "get_courses": fn_get_courses,
    "get_events": fn_get_events,
    "get_upcoming_events": fn_get_upcoming_events,
    "get_event_labels": fn_get_event_labels,
    "sync_to_calendar": fn_sync_to_calendar,
}


async def _execute_function_call(
    fn_name: str,
    fn_args: dict[str, Any],
    db: AsyncSession,
    user_id: UUID,
) -> Any:
    """Execute a function call from Gemini and return the result."""
    fn = FUNCTION_MAP.get(fn_name)
    if not fn:
        return {"error": f"Unknown function: {fn_name}"}
    try:
        return await fn(db, user_id, **fn_args)
    except Exception as exc:
        logger.error("Function %s failed: %s", fn_name, exc)
        return {"error": f"Lỗi khi thực thi {fn_name}: {str(exc)}"}


# ─── System Prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a smart academic assistant. You interact with the Database through the provided Functions.

RULES:
1. When the user asks about schedule, events, courses → CALL FUNCTION to query DB, DO NOT make up data.
2. If you need to know what types of events exist → call get_event_labels first.
3. Answer based on ACTUAL RESULTS from DB. If no data is found, inform clearly.
4. Answer briefly, with structure (bullet list if many items, specific dates).
5. Use English.
6. if user want to sync to Google Calendar → call sync_to_calendar.
7. Today: {today}
"""


# Main Chat Handler

async def handle_chat(
    db: AsyncSession,
    user_id: UUID,
    question: str,
    history: list[dict] | None = None,
) -> dict:
    """
    Process a chat message using Gemini Function Calling.
    Returns: {"answer": str, "action_taken": str | None}
    """
    client = _gemini_client()

    system_prompt = _SYSTEM_PROMPT.format(
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )

    # Build conversation history
    contents: list[gtypes.ContentUnion] = []
    for msg in (history or []):
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(gtypes.Content(role=role, parts=[gtypes.Part(text=msg["text"])]))

    # Append the current user message
    contents.append(gtypes.Content(role="user", parts=[gtypes.Part(text=question)]))

    # Tools configuration
    tools = gtypes.Tool(function_declarations=FUNCTION_DECLARATIONS)

    action_taken = None

    # Function calling loop (max 5 iterations to prevent infinite loops)
    for _ in range(5):
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=gtypes.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[tools],
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        # Check if the model wants to call a function
        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        if part.function_call:
            fn_call = part.function_call
            fn_name = fn_call.name
            fn_args = dict(fn_call.args) if fn_call.args else {}

            logger.info("Gemini called function: %s(%s)", fn_name, fn_args)
            action_taken = fn_name

            # Execute the function
            result = await _execute_function_call(fn_name, fn_args, db, user_id)

            # Add the function call and result to contents for next turn
            contents.append(candidate.content)
            contents.append(
                gtypes.Content(
                    role="user",
                    parts=[
                        gtypes.Part(
                            function_response=gtypes.FunctionResponse(
                                name=fn_name,
                                response={"result": result},
                            )
                        )
                    ],
                )
            )
            # Continue loop — Gemini may want to call another function or generate final answer
            continue
        else:
            # Model returned a text response — we're done
            answer = part.text.strip() if part.text else "No response from AI."
            return {"answer": answer, "action_taken": action_taken}

    # If we exhausted iterations, return last response
    return {
        "answer": "Done. Please ask again if you need more information.",
        "action_taken": action_taken,
    }
