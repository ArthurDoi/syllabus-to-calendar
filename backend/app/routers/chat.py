"""
POST /api/v1/chat — Function Calling chatbot endpoint.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models import User
from app.services.chat_service import handle_chat

router = APIRouter(prefix="/chat", tags=["AI Chat"])
logger = logging.getLogger(__name__)


# Schemas

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    action_taken: Optional[str] = None


# Endpoint

@router.post("/", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = body.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    history = [m.model_dump() for m in body.history]

    try:
        result = await handle_chat(
            db=db,
            user_id=current_user.id,
            question=question,
            history=history,
        )
    except Exception as exc:
        logger.error(f"Chat failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {exc}")

    return ChatResponse(
        answer=result["answer"],
        action_taken=result.get("action_taken"),
    )
