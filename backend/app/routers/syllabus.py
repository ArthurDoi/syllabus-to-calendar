import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_current_user
from app.database import get_db
from app.models import SyllabusUpload, User, Event, Course
from app.schemas import SyllabusUploadResponse, SyllabusParseResult, MessageResponse
from app.services.ai_parser import parse_syllabus_image

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Upload & Parse
@router.post("/upload", response_model=SyllabusUploadResponse, status_code=201)
async def upload_syllabus(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.content_type}")

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    # Save file to disk
    ext = Path(file.filename).suffix
    saved_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / saved_name
    file_path.write_bytes(content)

    # Create DB record với status "processing"
    upload = SyllabusUpload(
        user_id=current_user.id,
        course_id=uuid.UUID(course_id) if course_id else None,
        file_name=saved_name,
        original_name=file.filename,
        file_path=str(file_path),
        file_type=file.content_type,
        file_size=len(content),
        status="processing",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    # Chạy parse AI ở background để không block response
    background_tasks.add_task(
        _process_syllabus,
        upload_id=upload.id,
        file_path=str(file_path),
        file_type=file.content_type,
        user_id=current_user.id,
    )

    return upload


async def _process_syllabus(upload_id, file_path: str, file_type: str, user_id):
    """Background task: gọi AI parse rồi lưu JSON vào parsed_data.
    KHÔNG tạo Course/Event ở đây – việc tạo xảy ra khi user xác nhận trong ReviewModal.
    """
    from app.database import AsyncSessionLocal  # tránh circular import

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SyllabusUpload).where(SyllabusUpload.id == upload_id))
        upload: SyllabusUpload = result.scalar_one_or_none()
        if not upload:
            return

        try:
            parsed: SyllabusParseResult = await parse_syllabus_image(file_path, file_type)

            # Chỉ lưu kết quả parse – không tạo Course/Event
            # User sẽ xem lại và xác nhận trong ReviewModal
            upload.status = "done"
            upload.parsed_data = parsed.model_dump(mode="json")
            # course_id vẫn None cho đến khi user xác nhận

        except Exception as exc:
            upload.status = "error"
            upload.error_message = f"{type(exc).__name__}: {exc}"

        await db.commit()


# Get upload status
@router.get("/{upload_id}", response_model=SyllabusUploadResponse)
async def get_upload_status(
    upload_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SyllabusUpload).where(
            SyllabusUpload.id == upload_id,
            SyllabusUpload.user_id == current_user.id,
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


# List uploads
@router.get("/", response_model=list[SyllabusUploadResponse])
async def list_uploads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SyllabusUpload)
        .where(SyllabusUpload.user_id == current_user.id)
        .order_by(SyllabusUpload.created_at.desc())
    )
    return result.scalars().all()


# Delete upload
@router.delete("/{upload_id}", response_model=MessageResponse)
async def delete_upload(
    upload_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SyllabusUpload).where(
            SyllabusUpload.id == upload_id,
            SyllabusUpload.user_id == current_user.id,
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Xóa file vật lý
    if upload.file_path and os.path.exists(upload.file_path):
        os.remove(upload.file_path)

    await db.delete(upload)
    await db.commit()
    return MessageResponse(message="Deleted successfully")