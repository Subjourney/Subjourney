"""Main FastAPI application."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .routers import (
    teams,
    projects,
    journeys,
    phases,
    steps,
    cards,
    attributes,
    flows,
    comments,
)

settings = get_settings()

app = FastAPI(
    title="Subjourney API",
    description="API for Subjourney journey mapping platform",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(teams.router, prefix="/api", tags=["teams"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(journeys.router, prefix="/api", tags=["journeys"])
app.include_router(phases.router, prefix="/api", tags=["phases"])
app.include_router(steps.router, prefix="/api", tags=["steps"])
app.include_router(cards.router, prefix="/api", tags=["cards"])
app.include_router(attributes.router, prefix="/api", tags=["attributes"])
app.include_router(flows.router, prefix="/api", tags=["flows"])
app.include_router(comments.router, prefix="/api", tags=["comments"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Subjourney API is running"}


@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Subjourney API", "version": "1.0.0"}


@app.get("/api/health/supabase")
async def supabase_health():
    """Test Supabase connection."""
    try:
        from .database import get_supabase_admin
        
        supabase = get_supabase_admin()
        
        # Test auth connection
        users = supabase.auth.admin.list_users()
        
        # Test database connection
        result = supabase.table("teams").select("count").limit(1).execute()
        
        return {
            "status": "healthy",
            "supabase_url": settings.supabase_url,
            "auth_users": len(users.users) if hasattr(users, "users") else 0,
            "database": "connected",
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="info",
    )

