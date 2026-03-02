"""
Service trích xuất lịch trình từ ảnh/PDF syllabus bằng OpenAI GPT-4o Vision.
Thay OPENAI bằng Google Gemini nếu muốn.
"""

import base64
import json
from pathlib import Path
import httpx

from app.core.config import settings
from app.schemas import CourseCreate, EventCreate, SyllabusParseResult

OPENAI_CHAT_URL = settings.OPENAI_CHAT_URL

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
    """Gọi OpenAI GPT-4o Vision để parse syllabus"""

    file_bytes = Path(file_path).read_bytes()
    b64 = base64.b64encode(file_bytes).decode()

    # Xác định media type cho API
    media_map = {
        "image/jpeg": "image/jpeg",
        "image/png": "image/png",
        "image/webp": "image/webp",
        "application/pdf": "image/png",  # cần convert PDF trước nếu dùng Vision
    }
    media_type = media_map.get(file_type, "image/png")

    payload = {
        "model": settings.OPENAI_MODEL,
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}"},
                    },
                    {"type": "text", "text": "Hãy phân tích syllabus này và trả về JSON."},
                ],
            },
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            OPENAI_CHAT_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
        )

    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    # Parse JSON từ AI
    data = json.loads(raw.strip())

    course_info = None
    if data.get("course_info"):
        course_info = CourseCreate(**data["course_info"])

    events = []
    for ev in data.get("events", []):
        try:
            events.append(EventCreate(**ev))
        except Exception:
            pass  # bỏ qua event lỗi format

    return SyllabusParseResult(
        course_info=course_info,
        events=events,
        raw_text=raw,
    )