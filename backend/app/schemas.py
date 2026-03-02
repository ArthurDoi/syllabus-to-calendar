from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

# auth schemas

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = None
    
    @field_validator("password") #decorator báo pydantic biết khi kiểm tra dữ liệu chạy hàm này riêng cho trường pass có thể áp dụng với các trường khác
    @classmethod # nghĩa là phương thức thuộc class
    def password_strength(cls, value : str) -> str:
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit")
        return value
    



class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

# user schemas

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None


# Course Schemas


class CourseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: Optional[str] = None
    term: Optional[str] = None
    instructor: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    color: str = "#3b82f6"
    icon: str = "Calendar"

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    code: Optional[str] = None
    term: Optional[str] = None
    instructor: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CourseResponse(CourseCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Event Schemas


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    label: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    course_id: Optional[UUID] = None
    status: Optional[str] = Field(default=None, pattern="^(pending|in-progress|completed)$")
    week_number: Optional[int] = None
    metadata_json: Optional[dict[str, Any]] = None

class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    label: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = Field(default=None, pattern="^(pending|in-progress|completed)$")
    week_number: Optional[int] = None
    metadata_json: Optional[dict[str, Any]] = None


class EventResponse(EventCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}



#  Syllabus Upload Schemas

class SyllabusUploadResponse(BaseModel):
    id: UUID
    file_name: str
    original_name: str
    file_type: Optional[str]
    file_size: Optional[int]
    status: str                      # uploading | processing | done | error
    parsed_data: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    course_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyllabusParseResult(BaseModel):
    course_info: Optional[CourseCreate] = None
    events: list[EventCreate] = []
    raw_text: Optional[str] = None

# calendar Event Schemas

class CalendarEventResponse(BaseModel):
    id : UUID
    title: str
    description: Optional[str]
    start_date: datetime
    end_date: Optional[datetime]
    event_type: Optional[str]
    google_event_id: Optional[str]
    event_id: Optional[UUID]
    
    model_config = {"from_attributes": True}

class GoogleSyncStatusResponse(BaseModel):
    connected: bool
    calendar_id: Optional[str]
    last_synced_at: Optional[datetime]

#  User Stats Schemas

class UserStatsResponse(BaseModel):
    current_streak: int
    best_streak: int
    last_streak_date: Optional[datetime]

    model_config = {"from_attributes": True}


#  Common Response Wrappers

class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[Any]