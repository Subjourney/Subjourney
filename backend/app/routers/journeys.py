"""Journeys router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/journeys", tags=["journeys"])


class JourneyCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None


class JourneyResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    is_subjourney: bool = False
    parent_step_id: Optional[str] = None
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
        subjourneys = []
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
                subj_steps = []
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
                subjourney_with_structure = {
                    **subjourney,
                    "allPhases": subj_phases,
                    "allSteps": subj_steps,
                    "allCards": subj_cards,
                }
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

