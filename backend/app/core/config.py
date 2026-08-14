from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite for local development; set DATABASE_URL to a Postgres URL in production
    # (Render's filesystem is ephemeral, so a SQLite file would not survive a redeploy).
    DATABASE_URL: str = "sqlite:///./typeform.db"

    # Comma-separated list of origins allowed to call the API from a browser.
    CORS_ORIGINS: str = "http://localhost:3000"

    # Public base URL of the frontend, used to build shareable form links.
    FRONTEND_URL: str = "http://localhost:3000"

    # Auth is out of scope for this assignment: every request acts as this creator.
    DEFAULT_CREATOR_EMAIL: str = "creator@typeform.local"
    DEFAULT_CREATOR_NAME: str = "Demo Creator"

    SEED_ON_STARTUP: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
