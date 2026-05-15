import json
from pathlib import Path
from datetime import datetime

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas import CourseCreate, EventCreate, SyllabusParseResult


SYSTEM_PROMPT = """
You are a smart academic assistant. Your task is to read the syllabus image and return JSON with the following structure (do not add markdown or explanation):

{
  "course_info": {
    "name": "Course name",
    "code": "Course code (if any)",
    "term": "Term (if any)",
    "instructor": "Instructor name (if any)",
    "start_date": "ISO date or null",
    "end_date": "ISO date or null",
    "color": "#3b82f6",
    "icon": "Calendar"
  },
  "events": [
    {
      "title": "Course Name / Assignment / Exam / Task / ..etc",
      "label": "Any descriptive label: lecture, assignment, exam, holiday, seminar, lab, project, meeting, travel, or any relevant category",
      "description": "Description if any",
      "start_time": "ISO datetime or null",
      "end_time": "ISO datetime or null",
      "status": "pending",
      "week_number": 1
    }
  ]
}

if not found information, set to null. Always return pure JSON.
"""


async def parse_syllabus_image(file_path: str, file_type: str) -> SyllabusParseResult:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    file_bytes = Path(file_path).read_bytes()

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=file_bytes, mime_type=file_type),
            SYSTEM_PROMPT
        ]
    )

    raw = response.text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI return JSON invalid: {e}. Response: {raw[:200]}")

    course_info = None
    if data.get("course_info"):
        # Sanitize: convert empty strings → None for date fields
        ci = data["course_info"]
        for date_field in ("start_date", "end_date"):
            if ci.get(date_field) == "":
                ci[date_field] = None
        try:
            course_info = CourseCreate(**ci)
        except Exception:
            # If course_info cannot be parsed, create default one
            course_info = CourseCreate(name="Untitled Course")

    # If still no course_info, create default
    if not course_info:
        course_info = CourseCreate(name="Untitled Course")

    events = []
    for ev in data.get("events", []):
        # Sanitize date fields in events
        for date_field in ("start_time", "end_time"):
            if ev.get(date_field) == "":
                ev[date_field] = None
        try:
            events.append(EventCreate(**ev))
        except Exception:
            pass

    # Auto-calculate course start_date and end_date from events if not provided
    if events and not course_info.start_date and not course_info.end_date:
        try:
            event_dates = []
            for ev in events:
                if ev.start_time:
                    try:
                        dt = datetime.fromisoformat(str(ev.start_time).replace('Z', '+00:00'))
                        event_dates.append(dt)
                    except Exception:
                        pass
                if ev.end_time:
                    try:
                        dt = datetime.fromisoformat(str(ev.end_time).replace('Z', '+00:00'))
                        event_dates.append(dt)
                    except Exception:
                        pass

            if event_dates:
                course_info.start_date = min(event_dates)
                course_info.end_date = max(event_dates)
        except Exception:
            # If date calculation fails, continue without auto-calculating
            pass

    return SyllabusParseResult(
        course_info=course_info,
        events=events,
        raw_text=raw,
    )