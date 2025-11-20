"""Configuration settings for the backend application."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "local")
    docker_env: bool = os.getenv("DOCKER_ENV", "false").lower() == "true"
    
    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8001"))
    reload: bool = os.getenv("RELOAD", "false").lower() == "true"
    
    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
    supabase_anon_key: str = os.getenv(
        "SUPABASE_ANON_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    )
    supabase_service_role_key: str = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
    )
    supabase_jwt_secret: str = os.getenv(
        "SUPABASE_JWT_SECRET",
        "your-super-secret-jwt-token-with-at-least-32-characters-long"
    )
    
    # Database (direct PostgreSQL connection if needed)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

