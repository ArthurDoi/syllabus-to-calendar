import json
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas import CourseCreate, EventCreate, SyllabusParseResult


SYSTEM_PROMPT = """
Bạn là trợ lý giáo dục thông minh. Nhiệm vụ của bạn là đọc hình ảnh syllabus môn học
và trả về JSON với cấu trúc sau (không thêm markdown hay giải thích):

{
  "course_info": {
    "name": "Tên môn học",
    "code": "Mã môn (nếu có)",
    "term": "Học kỳ (nếu có)",
    "instructor": "Tên giảng viên (nếu có)",
    "start_date": "ISO date hoặc null",
    "end_date": "ISO date hoặc null",
    "color": "#3b82f6",
    "icon": "Calendar"
  },
  "events": [
    {
      "title": "Tên buổi học / bài tập / kỳ thi",
      "label": "lecture|assignment|exam|holiday",
      "description": "Mô tả ngắn nếu có",
      "start_time": "ISO datetime hoặc null",
      "end_time": "ISO datetime hoặc null",
      "status": "pending",
      "week_number": 1
    }
  ]
}

Nếu không tìm thấy thông tin, để null. Luôn trả về JSON thuần túy.
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
        raise ValueError(f"AI trả về JSON không hợp lệ: {e}. Response: {raw[:200]}")

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
            # Nếu không parse được course_info thì bỏ qua, vẫn lấy events
            course_info = None

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

    return SyllabusParseResult(
        course_info=course_info,
        events=events,
        raw_text=raw,
    )