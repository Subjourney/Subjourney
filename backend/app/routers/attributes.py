"""Attributes router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/attributes", tags=["attributes"])


class AttributeCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    allowed_values: Optional[dict] = None
    project_id: Optional[str] = None


@router.get("/{attribute_id}")
async def get_attribute(attribute_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single attribute by id."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("attributes")
            .select("*")
            .eq("id", attribute_id)
            .single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Attribute not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get attribute: {str(e)}")


@router.get("/team/{team_id}")
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


@router.post("/team/{team_id}")
async def create_team_attribute(
    team_id: str,
    attribute_data: AttributeCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new attribute definition for a team."""
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

        # Create attribute
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

