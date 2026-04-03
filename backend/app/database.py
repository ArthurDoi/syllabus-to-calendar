from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from urllib.parse import quote_plus
from app.core.config import settings

import ssl

password = quote_plus(settings.DATABASE_PASSWORD)
DATABASE_URL = f"postgresql+asyncpg://{settings.DATABASE_USERNAME}:{password}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}"

from typing import Any
# Setup connect_args
connect_args: dict[str, Any] = {
    # Fix for Supabase PgBouncer "prepared statement already exists"
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
}

# Only require SSL if connecting to a remote/Supabase database
if settings.DATABASE_HOSTNAME not in ("localhost", "127.0.0.1", "db"):
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

engine = create_async_engine(
    DATABASE_URL, 
    echo=settings.DEBUG,
    connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session