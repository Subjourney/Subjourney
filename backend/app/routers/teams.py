"""Teams router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamCreate(BaseModel):
    name: str
    description: str = ""


class TeamResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str = ""
    image_url: str = ""
    created_at: str
    updated_at: str


@router.post("/create", response_model=TeamResponse)
async def create_team(
    team_data: TeamCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new team for the current user."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Generate slug from name
        slug = team_data.name.lower().replace(" ", "-")
        
        # Create team
        team_result = (
            supabase.table("teams")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "name": team_data.name,
                    "slug": slug,
                    "description": team_data.description,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not team_result.data:
            raise HTTPException(status_code=500, detail="Failed to create team")
        
        team = team_result.data[0]
        
        # Create team membership for owner
        supabase.table("team_members").insert(
            {
                "id": str(uuid.uuid4()),
                "team_id": team["id"],
                "user_id": user_id,
                "role": "owner",
                "is_owner": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        ).execute()
        
        return TeamResponse(**team)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create team: {str(e)}")


@router.get("/mine")
async def get_my_teams(current_user: dict = Depends(get_current_user)):
    """Get teams the current user is a member of."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get user's team memberships with team data
        result = (
            supabase.table("team_members")
            .select("*, teams(*)")
            .eq("user_id", user_id)
            .execute()
        )
        
        teams = []
        for membership in result.data:
            team = membership.get("teams") or {}
            teams.append(
                {
                    "id": team.get("id"),
                    "name": team.get("name"),
                    "slug": team.get("slug"),
                    "image_url": team.get("image_url", ""),
                    "description": team.get("description", ""),
                    "created_at": team.get("created_at"),
                    "updated_at": team.get("updated_at"),
                    "role": membership.get("role", "member"),
                    "is_owner": membership.get("is_owner", False),
                }
            )
        
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get teams: {str(e)}")


@router.get("/{team_id}")
async def get_team(team_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific team by ID."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Check if user has access to this team
        membership_result = (
            supabase.table("team_members")
            .select("*, teams(*)")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership_result.data:
            raise HTTPException(status_code=403, detail="Access denied to this team")
        
        membership = membership_result.data[0]
        team = membership.get("teams") or {}
        
        return {
            "id": team.get("id"),
            "name": team.get("name"),
            "slug": team.get("slug"),
            "image_url": team.get("image_url", ""),
            "description": team.get("description", ""),
            "created_at": team.get("created_at"),
            "updated_at": team.get("updated_at"),
            "role": membership.get("role", "member"),
            "is_owner": membership.get("is_owner", False),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team: {str(e)}")


@router.get("/{team_id}/attributes")
async def get_team_attributes(
    team_id: str,
    project_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    """Get all attributes for a team, optionally filtered by project."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        # Verify team membership
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        query = supabase.table("attributes").select("*").eq("team_id", team_id)
        if project_id:
            query = query.eq("project_id", project_id)
        result = query.order("created_at", desc=True).execute()
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get attributes: {str(e)}")


class TeamAttributeCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    allowed_values: Optional[dict] = None
    project_id: Optional[str] = None


@router.post("/{team_id}/attributes")
async def create_team_attribute(
    team_id: str,
    attribute_data: TeamAttributeCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new attribute definition for a team (optionally project-scoped)."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        # Verify team membership
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        payload = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "project_id": attribute_data.project_id,
            "name": attribute_data.name,
            "type": attribute_data.type,
            "description": attribute_data.description,
            "allowed_values": attribute_data.allowed_values or None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = supabase.table("attributes").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create attribute")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create attribute: {str(e)}")
