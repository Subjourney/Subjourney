"""Projects router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    team_id: str
    name: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    team_id: str
    name: str
    description: str = ""
    created_at: str
    updated_at: str


@router.post("/create", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new project."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", project_data.team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied to this team")
        
        # Create project
        result = (
            supabase.table("projects")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "team_id": project_data.team_id,
                    "name": project_data.name,
                    "description": project_data.description,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        return ProjectResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")


@router.get("/team/{team_id}")
async def get_team_projects(
    team_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all projects for a team."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied to this team")
        
        # Get projects
        result = (
            supabase.table("projects")
            .select("*")
            .eq("team_id", team_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get projects: {str(e)}")


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific project by ID."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get project with team info
        result = (
            supabase.table("projects")
            .select("*, teams!inner(*)")
            .eq("id", project_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = result.data[0]
        team = project.get("teams", {})
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team.get("id"))
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project: {str(e)}")

