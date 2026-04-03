from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from urllib.parse import quote_plus
from app.core.config import settings

password = quote_plus(settings.DATABASE_PASSWORD)
DATABASE_URL = f"postgresql+asyncpg://{settings.DATABASE_USERNAME}:{password}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}"

engine = create_async_engine(
    DATABASE_URL, 
    echo=settings.DEBUG,
    connect_args={"ssl": "require"}
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session