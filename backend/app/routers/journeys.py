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


def _validate_and_fix_continue_step_id(supabase, subjourney: Dict[str, Any], parent_journey: Dict[str, Any], parent_phases: List[Dict[str, Any]], parent_steps: List[Dict[str, Any]]) -> bool:
    """
    Validate and fix continue_step_id for a subjourney.
    Returns True if the value was corrected, False if it was already correct.
    """
    computed_continue_step_id = _compute_continue_step_id_for_subjourney(
        subjourney,
        parent_journey,
        parent_phases,
        parent_steps,
    )
    
    current_continue_step_id = subjourney.get("continue_step_id")
    
    # Normalize both to strings for comparison
    computed_str = str(computed_continue_step_id) if computed_continue_step_id else None
    current_str = str(current_continue_step_id) if current_continue_step_id else None
    
    # Check if the current value is correct
    if computed_str == current_str:
        return False  # Already correct
    
    # Validate that the current continue_step_id exists and is valid
    if current_str:
        # Check if the step exists in the parent journey
        step_exists = any(s.get("id") == current_str for s in parent_steps)
        if not step_exists:
            # Step doesn't exist - definitely need to fix
            now = datetime.utcnow().isoformat()
            supabase.table("journeys").update({
                "continue_step_id": computed_continue_step_id,
                "updated_at": now,
            }).eq("id", subjourney["id"]).execute()
            return True
    
    # Value is different - update it
    now = datetime.utcnow().isoformat()
    supabase.table("journeys").update({
        "continue_step_id": computed_continue_step_id,
        "updated_at": now,
    }).eq("id", subjourney["id"]).execute()
    return True


def _update_continue_step_ids_for_journey(supabase, journey_id: str):
    """
    Validate and update continue_step_id for all subjourneys of a given journey.
    This should be called when steps are reordered or moved.
    Always validates to ensure correctness even if steps were reordered after subjourney creation.
    
    Args:
        supabase: Supabase client
        journey_id: ID of the journey whose subjourneys should be updated
    """
    # Get the journey
    journey_result = (
        supabase.table("journeys")
        .select("*")
        .eq("id", journey_id)
        .execute()
    )
    
    if not journey_result.data:
        return
    
    journey = journey_result.data[0]
    
    # Get all phases and steps for this journey
    phases_result = (
        supabase.table("phases")
        .select("*")
        .eq("journey_id", journey_id)
        .order("sequence_order")
        .execute()
    )
    phases = phases_result.data or []
    
    phase_ids = [p["id"] for p in phases]
    steps = []
    if phase_ids:
        steps_result = (
            supabase.table("steps")
            .select("*")
            .in_("phase_id", phase_ids)
            .order("sequence_order")
            .execute()
        )
        steps = steps_result.data or []
    
    # Get all subjourneys for this journey
    subjourneys_result = (
        supabase.table("journeys")
        .select("*")
        .eq("is_subjourney", True)
        .in_("parent_step_id", [s["id"] for s in steps])
        .execute()
    )
    subjourneys = subjourneys_result.data or []
    
    # Always validate and fix continue_step_id for each subjourney
    # This ensures correctness even if steps were reordered after subjourney creation
    for subjourney in subjourneys:
        # Always validate and fix - this ensures correctness
        _validate_and_fix_continue_step_id(supabase, subjourney, journey, phases, steps)


class JourneyCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None
    continue_step_id: Optional[str] = None


class JourneyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ReorderPhasesRequest(BaseModel):
    phase_ids: List[str]


class JourneyResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None
    continue_step_id: Optional[str] = None
    sequence_order: Optional[int] = None
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
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Calculate sequence_order for top-level journeys
        sequence_order = None
        if not journey_data.is_subjourney:
            # Get the maximum sequence_order for top-level journeys in this project
            existing_journeys = (
                supabase.table("journeys")
                .select("sequence_order")
                .eq("project_id", journey_data.project_id)
                .eq("is_subjourney", False)
                .execute()
            )
            
            if existing_journeys.data:
                # Filter out None values and get max
                sequence_orders = [j.get("sequence_order") for j in existing_journeys.data if j.get("sequence_order") is not None]
                if sequence_orders:
                    max_order = max(sequence_orders)
                    sequence_order = max_order + 1
                else:
                    sequence_order = 1  # First journey starts at 1
            else:
                sequence_order = 1  # First journey starts at 1
        
        # For subjourneys, compute continue_step_id if not provided
        computed_continue_step_id = journey_data.continue_step_id
        if journey_data.is_subjourney and journey_data.parent_step_id and not journey_data.continue_step_id:
            # Get parent step to find parent journey
            parent_step_result = (
                supabase.table("steps")
                .select("phase_id")
                .eq("id", journey_data.parent_step_id)
                .execute()
            )
            
            if parent_step_result.data:
                parent_phase_id = parent_step_result.data[0].get("phase_id")
                
                if parent_phase_id:
                    # Get phase to find journey
                    parent_phase_result = (
                        supabase.table("phases")
                        .select("journey_id")
                        .eq("id", parent_phase_id)
                        .execute()
                    )
                    
                    if parent_phase_result.data:
                        parent_journey_id = parent_phase_result.data[0].get("journey_id")
                        
                        if parent_journey_id:
                            # Get parent journey
                            parent_journey_result = (
                                supabase.table("journeys")
                                .select("*")
                                .eq("id", parent_journey_id)
                                .execute()
                            )
                            
                            if parent_journey_result.data:
                                parent_journey = parent_journey_result.data[0]
                                
                                # Get parent journey phases and steps
                                parent_phases_result = (
                                    supabase.table("phases")
                                    .select("*")
                                    .eq("journey_id", parent_journey_id)
                                    .order("sequence_order")
                                    .execute()
                                )
                                parent_phases = parent_phases_result.data or []
                                
                                parent_phase_ids = [p["id"] for p in parent_phases]
                                parent_steps = []
                                if parent_phase_ids:
                                    parent_steps_result = (
                                        supabase.table("steps")
                                        .select("*")
                                        .in_("phase_id", parent_phase_ids)
                                        .order("sequence_order")
                                        .execute()
                                    )
                                    parent_steps = parent_steps_result.data or []
                                
                                # Compute continue_step_id
                                subjourney_dict = {
                                    "parent_step_id": journey_data.parent_step_id,
                                    "continue_step_id": None,
                                }
                                computed_continue_step_id = _compute_continue_step_id_for_subjourney(
                                    subjourney_dict,
                                    parent_journey,
                                    parent_phases,
                                    parent_steps,
                                )
        
        # Create journey
        journey_insert = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "project_id": journey_data.project_id,
            "name": journey_data.name,
            "description": journey_data.description,
            "is_subjourney": journey_data.is_subjourney,
            "parent_step_id": journey_data.parent_step_id,
            "continue_step_id": computed_continue_step_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Only set sequence_order for top-level journeys
        if sequence_order is not None:
            journey_insert["sequence_order"] = sequence_order
        
        result = (
            supabase.table("journeys")
            .insert(journey_insert)
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
            supabase.table("team_memberships")
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
            .execute()
        )
        
        journeys = result.data or []
        
        # Sort in Python: top-level journeys by sequence_order, then subjourneys by created_at
        def sort_key(journey):
            if journey.get("is_subjourney"):
                # Subjourneys: sort by created_at descending, but after all top-level journeys
                # Use a large number to ensure they come after top-level journeys
                created_at = journey.get("created_at", "")
                return (1, created_at)  # Will be sorted descending by created_at
            else:
                # Top-level journeys: sort by sequence_order ascending
                return (0, journey.get("sequence_order", 0))
        
        # Sort: first by is_subjourney (0 for top-level, 1 for subjourneys)
        # Then by sequence_order for top-level, or created_at for subjourneys
        journeys.sort(key=sort_key)
        
        # Reverse subjourneys to get descending order by created_at
        # We'll do this by splitting and recombining
        top_level = [j for j in journeys if not j.get("is_subjourney")]
        subjourneys = [j for j in journeys if j.get("is_subjourney")]
        # Subjourneys should be in descending order by created_at
        subjourneys.sort(key=lambda j: j.get("created_at", ""), reverse=True)
        
        return top_level + subjourneys
        
        return journeys
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


@router.patch("/{journey_id}", response_model=JourneyResponse)
async def update_journey(
    journey_id: str,
    journey_data: JourneyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a journey."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get journey
        result = (
            supabase.table("journeys")
            .select("*")
            .eq("id", journey_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        journey = result.data[0]
        team_id = journey.get("team_id")
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied to this journey")
        
        # Build update data (only include fields that are provided)
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if journey_data.name is not None:
            update_data["name"] = journey_data.name
        if journey_data.description is not None:
            update_data["description"] = journey_data.description
        
        # Update journey
        result = (
            supabase.table("journeys")
            .update(update_data)
            .eq("id", journey_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update journey")
        
        return JourneyResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update journey: {str(e)}")


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

                # Always validate and fix continue_step_id to ensure correctness
                # This catches cases where steps were reordered after subjourney creation
                was_fixed = _validate_and_fix_continue_step_id(
                    supabase,
                    subjourney_with_structure,
                    journey,
                    phases,
                    all_steps,
                )
                
                # If it was fixed, reload the subjourney to get the updated continue_step_id
                if was_fixed:
                    updated_subjourney_result = (
                        supabase.table("journeys")
                        .select("*")
                        .eq("id", subjourney_id)
                        .execute()
                    )
                    if updated_subjourney_result.data:
                        subjourney_with_structure["continue_step_id"] = updated_subjourney_result.data[0].get("continue_step_id")
                
                # If continue_step_id is still not set, compute it (shouldn't happen after validation)
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


@router.post("/{journey_id}/reorder-phases")
async def reorder_phases(
    journey_id: str,
    payload: ReorderPhasesRequest,
    current_user: dict = Depends(get_current_user),
):
    """Reorder phases within a journey by setting sequence_order based on provided list."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()

        # Verify access via journey -> team
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
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")

        # Validate that provided phase IDs belong to this journey
        if payload.phase_ids:
            phases_check = (
                supabase.table("phases")
                .select("id")
                .in_("id", payload.phase_ids)
                .eq("journey_id", journey_id)
                .execute()
            )
            valid_ids = {row["id"] for row in (phases_check.data or [])}
            if not valid_ids.issuperset(set(payload.phase_ids)):
                raise HTTPException(status_code=400, detail="One or more phases do not belong to the journey")

        # Update sequence_order according to provided order (1-based indexing)
        now = datetime.utcnow().isoformat()
        for index, phase_id in enumerate(payload.phase_ids):
            supabase.table("phases").update(
                {"sequence_order": index + 1, "updated_at": now}
            ).eq("id", phase_id).eq("journey_id", journey_id).execute()

        return {"message": "Phases reordered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reorder phases: {str(e)}")


@router.delete("/{journey_id}")
async def delete_journey(
    journey_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a journey."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Get journey
        result = (
            supabase.table("journeys")
            .select("*")
            .eq("id", journey_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Journey not found")
        
        journey = result.data[0]
        team_id = journey.get("team_id")
        
        # Verify user has access to the team
        membership = (
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied to this journey")
        
        # Delete journey (cascade will handle related data if configured in database)
        result = (
            supabase.table("journeys")
            .delete()
            .eq("id", journey_id)
            .execute()
        )
        
        return {"message": "Journey deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete journey: {str(e)}")


@router.post("/validate-continue-step-ids/{project_id}")
async def validate_and_fix_continue_step_ids(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Validate and fix continue_step_id for all subjourneys in a project.
    This ensures all continue_step_ids are correct based on current step ordering.
    """
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify user has access to the project
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
            supabase.table("team_memberships")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all journeys in the project (top-level only)
        journeys_result = (
            supabase.table("journeys")
            .select("*")
            .eq("project_id", project_id)
            .eq("is_subjourney", False)
            .execute()
        )
        
        journeys = journeys_result.data or []
        fixed_count = 0
        total_subjourneys = 0
        
        # For each journey, validate and fix its subjourneys
        for journey in journeys:
            journey_id = journey["id"]
            
            # Get phases and steps for this journey
            phases_result = (
                supabase.table("phases")
                .select("*")
                .eq("journey_id", journey_id)
                .order("sequence_order")
                .execute()
            )
            phases = phases_result.data or []
            
            phase_ids = [p["id"] for p in phases]
            steps = []
            if phase_ids:
                steps_result = (
                    supabase.table("steps")
                    .select("*")
                    .in_("phase_id", phase_ids)
                    .order("sequence_order")
                    .execute()
                )
                steps = steps_result.data or []
            
            # Get all subjourneys for this journey
            if steps:
                subjourneys_result = (
                    supabase.table("journeys")
                    .select("*")
                    .eq("is_subjourney", True)
                    .in_("parent_step_id", [s["id"] for s in steps])
                    .execute()
                )
                subjourneys = subjourneys_result.data or []
                total_subjourneys += len(subjourneys)
                
                # Validate and fix each subjourney
                for subjourney in subjourneys:
                    if _validate_and_fix_continue_step_id(supabase, subjourney, journey, phases, steps):
                        fixed_count += 1
        
        return {
            "message": f"Validation complete. Fixed {fixed_count} out of {total_subjourneys} subjourneys.",
            "fixed_count": fixed_count,
            "total_subjourneys": total_subjourneys,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate continue_step_ids: {str(e)}")

