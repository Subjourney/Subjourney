"""Comments router."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..database import get_supabase_admin
import uuid
from datetime import datetime

router = APIRouter(prefix="/comments", tags=["comments"])


class CommentCreate(BaseModel):
    target_type: str  # 'journey', 'phase', 'step', 'card'
    target_id: str
    content: str
    parent_comment_id: Optional[str] = None


class CommentUpdate(BaseModel):
    content: str


@router.post("/create")
async def create_comment(
    comment_data: CommentCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new comment."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access based on target type
        team_id = None
        if comment_data.target_type == "journey":
            journey = (
                supabase.table("journeys")
                .select("team_id")
                .eq("id", comment_data.target_id)
                .execute()
            )
            if journey.data:
                team_id = journey.data[0].get("team_id")
        elif comment_data.target_type == "phase":
            phase = (
                supabase.table("phases")
                .select("journey_id, journeys!inner(team_id)")
                .eq("id", comment_data.target_id)
                .execute()
            )
            if phase.data:
                journey = phase.data[0].get("journeys", {})
                team_id = journey.get("team_id")
        elif comment_data.target_type == "step":
            step = (
                supabase.table("steps")
                .select("phase_id, phases!inner(journey_id, journeys!inner(team_id))")
                .eq("id", comment_data.target_id)
                .execute()
            )
            if step.data:
                phase = step.data[0].get("phases", {})
                journey = phase.get("journeys", {})
                team_id = journey.get("team_id")
        elif comment_data.target_type == "card":
            card = (
                supabase.table("cards")
                .select(
                    "step_id, steps!inner(phase_id, phases!inner(journey_id, journeys!inner(team_id)))"
                )
                .eq("id", comment_data.target_id)
                .execute()
            )
            if card.data:
                step = card.data[0].get("steps", {})
                phase = step.get("phases", {})
                journey = phase.get("journeys", {})
                team_id = journey.get("team_id")
        
        if not team_id:
            raise HTTPException(status_code=404, detail="Target not found")
        
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
        
        # Create comment
        result = (
            supabase.table("comments")
            .insert(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "target_type": comment_data.target_type,
                    "target_id": comment_data.target_id,
                    "content": comment_data.content,
                    "parent_comment_id": comment_data.parent_comment_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create comment")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")


@router.get("/target/{target_type}/{target_id}")
async def get_target_comments(
    target_type: str, target_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all comments for a target."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify access (similar to create)
        team_id = None
        if target_type == "journey":
            journey = (
                supabase.table("journeys")
                .select("team_id")
                .eq("id", target_id)
                .execute()
            )
            if journey.data:
                team_id = journey.data[0].get("team_id")
        # Add other target types as needed
        
        if not team_id:
            raise HTTPException(status_code=404, detail="Target not found")
        
        membership = (
            supabase.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("team_id", team_id)
            .execute()
        )
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get comments
        result = (
            supabase.table("comments")
            .select("*")
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .is_("parent_comment_id", "null")
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")


@router.patch("/{comment_id}")
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a comment."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify comment ownership
        comment = (
            supabase.table("comments")
            .select("user_id")
            .eq("id", comment_id)
            .execute()
        )
        
        if not comment.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if comment.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update comment
        result = (
            supabase.table("comments")
            .update(
                {
                    "content": comment_data.content,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .eq("id", comment_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update comment: {str(e)}")


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a comment."""
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        supabase = get_supabase_admin()
        
        # Verify comment ownership
        comment = (
            supabase.table("comments")
            .select("user_id")
            .eq("id", comment_id)
            .execute()
        )
        
        if not comment.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if comment.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete comment
        supabase.table("comments").delete().eq("id", comment_id).execute()
        
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(e)}")

