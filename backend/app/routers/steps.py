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
    sequence_order: int = 1


class StepUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sequence_order: Optional[int] = None

class StepAttributeCreate(BaseModel):
    attribute_definition_id: str
    relationship_type: Optional[str] = "primary"


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
            supabase.table("team_memberships")
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
                    "team_id": team_id,
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
            supabase.table("team_memberships")
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
            supabase.table("team_memberships")
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
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get phase_id before deletion for reordering
        phase_id = step_result.data[0].get("phase_id")
        
        # Delete step
        supabase.table("steps").delete().eq("id", step_id).execute()
        
        # Reorder remaining steps in the phase (1-based indexing)
        remaining_steps_result = (
            supabase.table("steps")
            .select("id")
            .eq("phase_id", phase_id)
            .order("sequence_order")
            .execute()
        )
        
        if remaining_steps_result.data:
            remaining_step_ids = [step["id"] for step in remaining_steps_result.data]
            now = datetime.utcnow().isoformat()
            for index, remaining_step_id in enumerate(remaining_step_ids):
                supabase.table("steps").update(
                    {"sequence_order": index + 1, "updated_at": now}
                ).eq("id", remaining_step_id).eq("phase_id", phase_id).execute()
        
        return {"message": "Step deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete step: {str(e)}")


@router.get("/{step_id}/attributes")
async def get_step_attributes(step_id: str, current_user: dict = Depends(get_current_user)):
    """Get all attribute instances for a step (step_attributes junction)."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        # Verify access via step -> phase -> journey -> team
        step_result = (
            supabase.table("steps")
            .select("team_id")
            .eq("id", step_id)
            .single()
            .execute()
        )
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")

        team_id = step_result.data.get("team_id")
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        result = (
            supabase.table("step_attributes")
            .select("step_id, attribute_definition_id, sequence_order, relationship_type")
            .eq("step_id", step_id)
            .order("sequence_order", desc=False)
            .execute()
        )
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get step attributes: {str(e)}")


@router.post("/{step_id}/attributes")
async def add_attribute_to_step(
    step_id: str,
    payload: StepAttributeCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a step_attribute instance on a step."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        # Verify access via step -> team
        step_result = (
            supabase.table("steps")
            .select("team_id")
            .eq("id", step_id)
            .single()
            .execute()
        )
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")

        team_id = step_result.data.get("team_id")
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        # Determine next sequence_order
        existing = (
            supabase.table("step_attributes")
            .select("sequence_order")
            .eq("step_id", step_id)
            .order("sequence_order", desc=True)
            .limit(1)
            .execute()
        )
        next_order = (existing.data[0]["sequence_order"] + 1) if existing.data else 0

        # Insert step_attribute
        result = (
            supabase.table("step_attributes")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "step_id": step_id,
                    "attribute_definition_id": payload.attribute_definition_id,
                    "relationship_type": payload.relationship_type or "primary",
                    "sequence_order": next_order,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add attribute to step")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add attribute to step: {str(e)}")


@router.delete("/{step_id}/attributes/{attribute_id}")
async def remove_attribute_from_step(
    step_id: str,
    attribute_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a step_attribute instance from a step by attribute_definition_id."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        # Verify access via step -> team
        step_result = (
            supabase.table("steps")
            .select("team_id")
            .eq("id", step_id)
            .single()
            .execute()
        )
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")

        team_id = step_result.data.get("team_id")
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        supabase.table("step_attributes").delete().eq("step_id", step_id).eq(
            "attribute_definition_id", attribute_id
        ).execute()
        return {"message": "Removed attribute from step"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove attribute from step: {str(e)}")
