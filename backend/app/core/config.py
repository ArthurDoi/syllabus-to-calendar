from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    DATABASE_HOSTNAME: str
    DATABASE_PORT: int = 5432
    DATABASE_PASSWORD: str
    DATABASE_NAME: str
    DATABASE_USERNAME: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30



    OPENAI_CHAT_URL: str
    APP_NAME: str


    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    FRONTEND_URL: str = "http://localhost:3000"

    # OpenAI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # App
    DEBUG: bool = False
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty= True)

settings = Settings()