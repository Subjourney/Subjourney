"""Flows router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/flows", tags=["flows"])


class FlowCreate(BaseModel):
    journey_id: str
    name: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class FlowStepCreate(BaseModel):
    flow_id: str
    step_id: str
    sequence_order: int = 0
    config: Optional[Dict[str, Any]] = None


@router.post("/create")
async def create_flow(
    flow_data: FlowCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new flow."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access via journey -> team
        journey_result = (
            supabase.table("journeys")
            .select("team_id")
            .eq("id", flow_data.journey_id)
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
        
        # Create flow
        result = (
            supabase.table("flows")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "journey_id": flow_data.journey_id,
                    "name": flow_data.name,
                    "description": flow_data.description,
                    "config": flow_data.config or {},
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create flow")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create flow: {str(e)}")


@router.get("/journey/{journey_id}")
async def get_journey_flows(
    journey_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all flows for a journey."""
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
        
        # Get flows
        result = (
            supabase.table("flows")
            .select("*")
            .eq("journey_id", journey_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get flows: {str(e)}")

