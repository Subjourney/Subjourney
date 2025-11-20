"""Cards router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/cards", tags=["cards"])


class CardCreate(BaseModel):
    step_id: str
    card_type: str
    module_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    sequence_order: int = 0


class CardUpdate(BaseModel):
    card_type: Optional[str] = None
    module_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    sequence_order: Optional[int] = None


@router.post("/create")
async def create_card(
    card_data: CardCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new card."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access via step -> phase -> journey -> team
        step_result = (
            supabase.table("steps")
            .select("phase_id, phases!inner(journey_id, journeys!inner(team_id))")
            .eq("id", card_data.step_id)
            .execute()
        )
        
        if not step_result.data:
            raise HTTPException(status_code=404, detail="Step not found")
        
        step = step_result.data[0]
        phase = step.get("phases", {})
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
        
        # Create card
        result = (
            supabase.table("cards")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "step_id": card_data.step_id,
                    "card_type": card_data.card_type,
                    "module_id": card_data.module_id,
                    "config": card_data.config or {},
                    "sequence_order": card_data.sequence_order,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create card")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create card: {str(e)}")


@router.get("/step/{step_id}")
async def get_step_cards(step_id: str, current_user: dict = Depends(get_current_user)):
    """Get all cards for a step."""
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
        
        step = step_result.data[0]
        phase = step.get("phases", {})
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
        
        # Get cards
        result = (
            supabase.table("cards")
            .select("*")
            .eq("step_id", step_id)
            .order("sequence_order")
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cards: {str(e)}")


@router.patch("/{card_id}")
async def update_card(
    card_id: str, card_data: CardUpdate, current_user: dict = Depends(get_current_user)
):
    """Update a card."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        card_result = (
            supabase.table("cards")
            .select(
                "step_id, steps!inner(phase_id, phases!inner(journey_id, journeys!inner(team_id)))"
            )
            .eq("id", card_id)
            .execute()
        )
        
        if not card_result.data:
            raise HTTPException(status_code=404, detail="Card not found")
        
        card = card_result.data[0]
        step = card.get("steps", {})
        phase = step.get("phases", {})
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
        
        # Update card
        update_data = card_data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = (
            supabase.table("cards")
            .update(update_data)
            .eq("id", card_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update card: {str(e)}")


@router.delete("/{card_id}")
async def delete_card(card_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a card."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access
        card_result = (
            supabase.table("cards")
            .select(
                "step_id, steps!inner(phase_id, phases!inner(journey_id, journeys!inner(team_id)))"
            )
            .eq("id", card_id)
            .execute()
        )
        
        if not card_result.data:
            raise HTTPException(status_code=404, detail="Card not found")
        
        card = card_result.data[0]
        step = card.get("steps", {})
        phase = step.get("phases", {})
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
        
        # Delete card
        supabase.table("cards").delete().eq("id", card_id).execute()
        
        return {"message": "Card deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete card: {str(e)}")

