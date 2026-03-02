import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_current_user
from app.database import get_db
from app.models import Course, User
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, MessageResponse

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course)
        .where(Course.user_id == current_user.id)
        .order_by(Course.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = Course(user_id=current_user.id, **body.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    body: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.user_id == current_user.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    await db.delete(course)
    await db.commit()
    return MessageResponse(message="Course deleted")