"""Steps router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/steps", tags=["steps"])


class StepCreate(BaseModel):
    phase_id: str
    name: str
    description: Optional[str] = None
    sequence_order: int = 0


class StepUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sequence_order: Optional[int] = None


@router.post("/create")
async def create_step(
    step_data: StepCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new step."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access via phase -> journey -> team
        phase_result = (
            supabase.table("phases")
            .select("journey_id, journeys!inner(team_id)")
            .eq("id", step_data.phase_id)
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
        
        # Create step
        result = (
            supabase.table("steps")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "phase_id": step_data.phase_id,
                    "name": step_data.name,
                    "description": step_data.description,
                    "sequence_order": step_data.sequence_order,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create step")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create step: {str(e)}")


@router.get("/phase/{phase_id}")
async def get_phase_steps(
    phase_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all steps for a phase."""
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
        
        # Get steps
        result = (
            supabase.table("steps")
            .select("*")
            .eq("phase_id", phase_id)
            .order("sequence_order")
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get steps: {str(e)}")


@router.patch("/{step_id}")
async def update_step(
    step_id: str, step_data: StepUpdate, current_user: dict = Depends(get_current_user)
):
    """Update a step."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        step_result = (
            supabase.table("steps")
            .select("phase_id, phases!inner(journey_id, journeys!inner(team_id))")
            .eq("id", step_id)
            .execute()
        )
        
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        phase = step_result.data[0].get("phases", {})
        journey = phase.get("journeys", {})
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
        
        # Update step
        update_data = step_data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = (
            supabase.table("steps")
            .update(update_data)
            .eq("id", step_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update step: {str(e)}")


@router.delete("/{step_id}")
async def delete_step(step_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a step."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        step_result = (
            supabase.table("steps")
            .select("phase_id, phases!inner(journey_id, journeys!inner(team_id))")
            .eq("id", step_id)
            .execute()
        )
        
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        phase = step_result.data[0].get("phases", {})
        journey = phase.get("journeys", {})
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
        
        # Delete step
        supabase.table("steps").delete().eq("id", step_id).execute()
        
        return {"message": "Step deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete step: {str(e)}")

