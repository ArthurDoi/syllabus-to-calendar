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


# Upload & Parse
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

    # Create DB record with status "uploaded" – not parsed AI yet
    upload = SyllabusUpload(
        user_id=current_user.id,
        course_id=uuid.UUID(course_id) if course_id else None,
        file_name=saved_name,
        original_name=file.filename,
        file_path=str(file_path),
        file_type=file.content_type,
        file_size=len(content),
        status="uploaded",
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    # Not automatically parsed – user must click "Extract" to trigger
    return upload


async def _process_syllabus(upload_id, file_path: str, file_type: str, user_id):
    """Background task: call AI parse then save JSON to parsed_data.
    Not creating Course/Event here – creation happens when user confirms in ReviewModal.
    """
    from app.database import AsyncSessionLocal  # avoid circular import

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SyllabusUpload).where(SyllabusUpload.id == upload_id))
        upload: SyllabusUpload = result.scalar_one_or_none()
        if not upload:
            return

        try:
            parsed: SyllabusParseResult = await parse_syllabus_image(file_path, file_type)
            upload.status = "done"
            upload.parsed_data = parsed.model_dump(mode="json")
            await db.commit()

        except Exception as exc:
            upload.status = "error"
            upload.error_message = f"{type(exc).__name__}: {exc}"
            await db.commit()


# Trigger AI extraction manually
@router.post("/{upload_id}/extract", response_model=SyllabusUploadResponse)
async def extract_syllabus(
    upload_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI parsing for an uploaded syllabus (called manually by user)."""
    result = await db.execute(
        select(SyllabusUpload).where(
            SyllabusUpload.id == upload_id,
            SyllabusUpload.user_id == current_user.id,
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if upload.status == "processing":
        raise HTTPException(status_code=409, detail="Already processing")

    # Update status → processing
    upload.status = "processing"
    await db.commit()
    await db.refresh(upload)

    background_tasks.add_task(
        _process_syllabus,
        upload_id=upload.id,
        file_path=upload.file_path,
        file_type=upload.file_type,
        user_id=current_user.id,
    )
    return upload


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


# Serve file for preview
@router.get("/{upload_id}/file")
async def get_upload_file(
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
    file_path = Path(upload.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    from fastapi.responses import FileResponse
    return FileResponse(str(file_path), media_type=upload.file_type, filename=upload.original_name)


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

    # Delete physical file
    if upload.file_path and os.path.exists(upload.file_path):
        os.remove(upload.file_path)

    await db.delete(upload)
    await db.commit()
    return MessageResponse(message="Deleted successfully")