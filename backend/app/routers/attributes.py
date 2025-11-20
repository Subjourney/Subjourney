"""Attributes router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/attributes", tags=["attributes"])


class AttributeCreate(BaseModel):
    team_id: str
    name: str
    attribute_type: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


@router.post("/create")
async def create_attribute(
    attribute_data: AttributeCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new attribute definition."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify team membership
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", attribute_data.team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create attribute
        result = (
            supabase.table("attributes")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "team_id": attribute_data.team_id,
                    "name": attribute_data.name,
                    "attribute_type": attribute_data.attribute_type,
                    "description": attribute_data.description,
                    "config": attribute_data.config or {},
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create attribute")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create attribute: {str(e)}")


@router.get("/team/{team_id}")
async def get_team_attributes(
    team_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all attributes for a team."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify team membership
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get attributes
        result = (
            supabase.table("attributes")
            .select("*")
            .eq("team_id", team_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get attributes: {str(e)}")

