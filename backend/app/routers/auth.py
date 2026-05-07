from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
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


def set_auth_cookies(response, access_token: str, refresh_token: str):
    """Helper to set HttpOnly cookies for production security"""
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )
    return response


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

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    response = JSONResponse(
        content=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        ).model_dump()
    )
    
    # Set HttpOnly cookies for production security
    response = set_auth_cookies(response, access_token, refresh_token)
    return response

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    body: RefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token from HttpOnly cookies or request body"""
    # Get refresh token from cookies (production) or request body (backward compat)
    refresh_token_str = request.cookies.get("refresh_token")
    
    if not refresh_token_str and body:
        refresh_token_str = body.refresh_token
    
    if not refresh_token_str:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    
    payload = decode_token(refresh_token_str)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    
    response = JSONResponse(
        content=TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
        ).model_dump()
    )
    
    # Update HttpOnly cookies
    response = set_auth_cookies(response, access_token, new_refresh_token)
    return response


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
    """Google redirect về đây với authorization code (used for local dev)"""
    frontend_url = settings.FRONTEND_URL

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

    # Determine which user to link calendar to
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

    # Save Google token for Calendar sync
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

    # Generate tokens for frontend
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Redirect to frontend
    # If state has (Connect Calendar flow) → redirect straight back
    if state:
        response = RedirectResponse(url=f"{frontend_url}/calendar?connected=1", status_code=302)
        response = set_auth_cookies(response, access_token, refresh_token)
        return response

    # If Sign-in flow → redirect to dashboard with HttpOnly cookies
    response = RedirectResponse(url=f"{frontend_url}/courses", status_code=302)
    response = set_auth_cookies(response, access_token, refresh_token)
    return response


class GoogleExchangeRequest(BaseModel):
    code: str
    state: str | None = None


@router.post("/google/exchange")
async def google_exchange(body: GoogleExchangeRequest, db: AsyncSession = Depends(get_db)):
    """Exchange Google auth code from Vercel frontend callback. Used in production
    because Render router blocks the direct GET /google/callback endpoint."""
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": body.code,
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
        raise HTTPException(status_code=400, detail="google_token_failed")

    user = None

    if body.state:
        try:
            payload = decode_token(body.state)
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == UUID(user_id)))
                user = result.scalar_one_or_none()
        except Exception:
            pass

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
            raise HTTPException(status_code=400, detail="no_email")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=email, name=name, password_hash="")
            db.add(user)
            await db.flush()

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
    return {"success": True}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models import UserStats
    result = await db.execute(select(UserStats).where(UserStats.user_id == current_user.id))
    stats = result.scalar_one_or_none()
    
    if not stats:
        return {"current_streak": 0, "best_streak": 0}
        
    return {
        "current_streak": stats.current_streak,
        "best_streak": stats.best_streak
    }

@router.post("/logout", response_model=MessageResponse)
async def logout():
    response = JSONResponse(
        content=MessageResponse(message="Logged out successfully").model_dump()
    )
    # Clear HttpOnly cookies
    response.delete_cookie(
        key="access_token",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )
    response.delete_cookie(
        key="refresh_token",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )
    return response