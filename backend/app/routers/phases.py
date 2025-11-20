"""Phases router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/phases", tags=["phases"])


class PhaseCreate(BaseModel):
    journey_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    sequence_order: int = 0


class PhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    sequence_order: Optional[int] = None


@router.post("/create")
async def create_phase(
    phase_data: PhaseCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new phase."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access via journey -> project -> team
        journey_result = (
            supabase.table("journeys")
            .select("team_id, projects!inner(team_id)")
            .eq("id", phase_data.journey_id)
            .execute()
        )
        
        if not journey_result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        team_id = journey_result.data[0].get("team_id")
        
        # Check team membership
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create phase
        result = (
            supabase.table("phases")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "journey_id": phase_data.journey_id,
                    "name": phase_data.name,
                    "description": phase_data.description,
                    "color": phase_data.color,
                    "sequence_order": phase_data.sequence_order,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create phase")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create phase: {str(e)}")


@router.get("/journey/{journey_id}")
async def get_journey_phases(
    journey_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all phases for a journey."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        journey_result = (
            supabase.table("journeys")
            .select("team_id")
            .eq("id", journey_id)
            .execute()
        )
        
        if not journey_result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        team_id = journey_result.data[0].get("team_id")
        
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get phases
        result = (
            supabase.table("phases")
            .select("*")
            .eq("journey_id", journey_id)
            .order("sequence_order")
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get phases: {str(e)}")


@router.patch("/{phase_id}")
async def update_phase(
    phase_id: str,
    phase_data: PhaseUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a phase."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        phase_result = (
            supabase.table("phases")
            .select("journey_id, journeys!inner(team_id)")
            .eq("id", phase_id)
            .execute()
        )
        
        if not phase_result.data:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        journey = phase_result.data[0].get("journeys", {})
        team_id = journey.get("team_id")
        
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update phase
        update_data = phase_data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = (
            supabase.table("phases")
            .update(update_data)
            .eq("id", phase_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update phase: {str(e)}")


@router.delete("/{phase_id}")
async def delete_phase(phase_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a phase."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        phase_result = (
            supabase.table("phases")
            .select("journey_id, journeys!inner(team_id)")
            .eq("id", phase_id)
            .execute()
        )
        
        if not phase_result.data:
            raise HTTPException(status_code=404, detail="Phase not found")
        
        journey = phase_result.data[0].get("journeys", {})
        team_id = journey.get("team_id")
        
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete phase
        supabase.table("phases").delete().eq("id", phase_id).execute()
        
        return {"message": "Phase deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete phase: {str(e)}")

