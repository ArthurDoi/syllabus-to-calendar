from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.database import get_db
from app.models import User, GoogleCalendarSync
from app.schemas import (
    RegisterRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_CALENDAR_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form.username))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/google/login")
async def google_login(state: str | None = None):
    """Redirect người dùng đến Google OAuth2 consent screen"""
    from urllib.parse import urlencode
    scope = " ".join(GOOGLE_CALENDAR_SCOPES)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str, state: str | None = None, db: AsyncSession = Depends(get_db)):
    """Google redirect về đây với authorization code"""
    frontend_url = settings.FRONTEND_URL

    # 1. Đổi code lấy token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    token_data = token_resp.json()
    google_access_token = token_data.get("access_token")
    google_refresh_token = token_data.get("refresh_token")

    if not google_access_token:
        return RedirectResponse(url=f"{frontend_url}/calendar?error=google_token_failed")

    # 2. Determine which user to link calendar to
    user = None

    # If state contains a JWT → link to that existing user (Connect Calendar flow)
    if state:
        try:
            payload = decode_token(state)
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == UUID(user_id)))
                user = result.scalar_one_or_none()
        except Exception:
            pass

    # Otherwise use Google userinfo to find/create user (Sign-in with Google flow)
    if not user:
        async with httpx.AsyncClient() as client:
            info_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
        info = info_resp.json()
        email = info.get("email")
        name = info.get("name")
        if not email:
            return RedirectResponse(url=f"{frontend_url}/calendar?error=no_email")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=email, name=name, password_hash="")
            db.add(user)
            await db.flush()

    # 3. Lưu Google token cho Calendar sync
    result = await db.execute(
        select(GoogleCalendarSync).where(GoogleCalendarSync.user_id == user.id)
    )
    sync = result.scalar_one_or_none()

    if sync:
        sync.access_token = google_access_token
        if google_refresh_token:
            sync.refresh_token = google_refresh_token
    else:
        sync = GoogleCalendarSync(
            user_id=user.id,
            access_token=google_access_token,
            refresh_token=google_refresh_token,
        )
        db.add(sync)

    await db.commit()

    # 4. Redirect về frontend calendar page
    # Nếu state có (Connect Calendar flow) → redirect thẳng về, token đã có
    if state:
        return RedirectResponse(url=f"{frontend_url}/calendar?connected=1")

    # Nếu Sign-in flow → trả token mới
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout():
    # JWT là stateless; client xóa token phía mình
    # Nếu cần blacklist token, implement Redis ở đây
    return MessageResponse(message="Logged out successfully")