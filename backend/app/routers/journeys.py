"""Journeys router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/journeys", tags=["journeys"])


def _compute_continue_step_id_for_subjourney(
    subjourney: Dict[str, Any],
    parent_journey: Dict[str, Any],
    parent_phases: List[Dict[str, Any]],
    parent_steps: List[Dict[str, Any]],
) -> Optional[str]:
    """
    Compute the default continuation step for a subjourney based on the current
    ordering of phases and steps in its parent journey.

    Rules:
    - If subjourney['continue_step_id'] is already set, respect it (handled by caller).
    - Otherwise:
      1) Default to the next sequential step after parent_step_id in the parent journey.
      2) If parent_step_id is the last step AND the parent journey is itself a subjourney,
         "return" to that same parent_step_id (loop back within the base/parent subjourney).
      3) If no valid continuation can be determined, return None.

    This is intentionally computed at read-time so that it stays consistent when
    phases/steps are reordered; we don't persist the derived value back to the DB.
    """
    parent_step_id = subjourney.get("parent_step_id")
    if not parent_step_id:
        return None

    # Build ordered list of all steps in the parent journey:
    # sort phases by sequence_order, then steps within each phase by sequence_order.
    sorted_phases = sorted(parent_phases, key=lambda p: p.get("sequence_order", 0))
    all_steps_sorted: List[Dict[str, Any]] = []

    for phase in sorted_phases:
        phase_id = phase.get("id")
        if not phase_id:
            continue
        phase_steps = [s for s in parent_steps if s.get("phase_id") == phase_id]
        phase_steps_sorted = sorted(phase_steps, key=lambda s: s.get("sequence_order", 0))
        all_steps_sorted.extend(phase_steps_sorted)

    # Find index of the parent step within the ordered list
    parent_step_index: Optional[int] = None
    for idx, step in enumerate(all_steps_sorted):
        if step.get("id") == parent_step_id:
            parent_step_index = idx
            break

    if parent_step_index is None:
        return None

    # Case 1: There's a next step in the parent journey – continue there
    if parent_step_index < len(all_steps_sorted) - 1:
        next_step = all_steps_sorted[parent_step_index + 1]
        next_step_id = next_step.get("id")
        return str(next_step_id) if next_step_id else None

    # Case 2: Parent step is last AND parent journey is itself a subjourney.
    # Loop back to the parent step within the base/parent subjourney.
    if parent_journey.get("is_subjourney"):
        return str(parent_step_id)

    # No robust default continuation can be derived in this context
    return None


class JourneyCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None
    continue_step_id: Optional[str] = None


class JourneyResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None
    continue_step_id: Optional[str] = None
    created_at: str
    updated_at: str


@router.post("/create", response_model=JourneyResponse)
async def create_journey(
    journey_data: JourneyCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new journey."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify user has access to the project (via team)
        project_result = (
            supabase.table("projects")
            .select("team_id, teams!inner(id)")
            .eq("id", journey_data.project_id)
            .execute()
        )
        
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        team_id = project_result.data[0].get("team_id")
        
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
        
        # Create journey
        result = (
            supabase.table("journeys")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "team_id": team_id,
                    "project_id": journey_data.project_id,
                    "name": journey_data.name,
                    "description": journey_data.description,
                    "is_subjourney": journey_data.is_subjourney,
                    "parent_step_id": journey_data.parent_step_id,
                    "continue_step_id": journey_data.continue_step_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create journey")
        
        return JourneyResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create journey: {str(e)}")


@router.get("/project/{project_id}")
async def get_project_journeys(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all journeys for a project."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access via project -> team
        project_result = (
            supabase.table("projects")
            .select("team_id")
            .eq("id", project_id)
            .execute()
        )
        
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        team_id = project_result.data[0].get("team_id")
        
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
        
        # Get journeys
        result = (
            supabase.table("journeys")
            .select("*")
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get journeys: {str(e)}")


@router.get("/{journey_id}")
async def get_journey(journey_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific journey by ID."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get journey with team info
        result = (
            supabase.table("journeys")
            .select("*, teams!inner(id)")
            .eq("id", journey_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        journey = result.data[0]
        team = journey.get("teams", {})
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team.get("id"))
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return journey
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get journey: {str(e)}")


@router.get("/{journey_id}/structure")
async def get_journey_structure(
    journey_id: str,
    include_subjourneys: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get a journey with full structure: phases, steps, cards, and subjourneys."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get journey with team info
        journey_result = (
            supabase.table("journeys")
            .select("*, teams!inner(id)")
            .eq("id", journey_id)
            .execute()
        )
        
        if not journey_result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        journey = journey_result.data[0]
        team = journey.get("teams", {})
        team_id = team.get("id")
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get phases for this journey
        phases_result = (
            supabase.table("phases")
            .select("*")
            .eq("journey_id", journey_id)
            .order("sequence_order")
            .execute()
        )
        phases = phases_result.data or []
        
        # Get all steps for phases in this journey
        phase_ids = [phase["id"] for phase in phases]
        all_steps = []
        if phase_ids:
            steps_result = (
                supabase.table("steps")
                .select("*")
                .in_("phase_id", phase_ids)
                .order("sequence_order")
                .execute()
            )
            all_steps = steps_result.data or []
        
        # Get all cards for steps in this journey
        step_ids = [step["id"] for step in all_steps]
        all_cards = []
        if step_ids:
            cards_result = (
                supabase.table("cards")
                .select("*")
                .in_("step_id", step_ids)
                .order("sequence_order")
                .execute()
            )
            all_cards = cards_result.data or []
        
        # Get subjourneys if requested
        # Subjourneys are journeys where parent_step_id matches any step in this journey
        subjourneys: List[Dict[str, Any]] = []
        if include_subjourneys and step_ids:
            subjourneys_result = (
                supabase.table("journeys")
                .select("*")
                .in_("parent_step_id", step_ids)
                .eq("is_subjourney", True)
                .execute()
            )
            subjourneys_raw = subjourneys_result.data or []
            
            # For each subjourney, load its phases, steps, and cards
            for subjourney in subjourneys_raw:
                subjourney_id = subjourney["id"]
                
                # Get phases for subjourney
                subj_phases_result = (
                    supabase.table("phases")
                    .select("*")
                    .eq("journey_id", subjourney_id)
                    .order("sequence_order")
                    .execute()
                )
                subj_phases = subj_phases_result.data or []
                
                # Get steps for subjourney phases
                subj_phase_ids = [phase["id"] for phase in subj_phases]
                subj_steps: List[Dict[str, Any]] = []
                if subj_phase_ids:
                    subj_steps_result = (
                        supabase.table("steps")
                        .select("*")
                        .in_("phase_id", subj_phase_ids)
                        .order("sequence_order")
                        .execute()
                    )
                    subj_steps = subj_steps_result.data or []
                
                # Get cards for subjourney steps
                subj_step_ids = [step["id"] for step in subj_steps]
                subj_cards = []
                if subj_step_ids:
                    subj_cards_result = (
                        supabase.table("cards")
                        .select("*")
                        .in_("step_id", subj_step_ids)
                        .order("sequence_order")
                        .execute()
                    )
                    subj_cards = subj_cards_result.data or []
                
                # Build subjourney with full structure
                subjourney_with_structure: Dict[str, Any] = {
                    **subjourney,
                    "allPhases": subj_phases,
                    "allSteps": subj_steps,
                    "allCards": subj_cards,
                }

                # If continue_step_id is not explicitly set on the subjourney, derive a robust default
                if not subjourney_with_structure.get("continue_step_id"):
                    derived_continue_step_id = _compute_continue_step_id_for_subjourney(
                        subjourney_with_structure,
                        journey,
                        phases,
                        all_steps,
                    )
                    if derived_continue_step_id:
                        subjourney_with_structure["continue_step_id"] = derived_continue_step_id

                subjourneys.append(subjourney_with_structure)
        
        # Build response structure
        response = {
            **journey,
            "allPhases": phases,
            "allSteps": all_steps,
            "allCards": all_cards,
            "subjourneys": subjourneys,
        }
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get journey structure: {str(e)}")

