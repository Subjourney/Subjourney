"""Authentication utilities for Supabase."""
from typing import Dict, Any, Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .database import get_supabase_admin

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Get current authenticated user from Supabase JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    try:
        supabase = get_supabase_admin()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        user = user_response.user
        return {
            "user_id": user.id,
            "email": user.email,
            "user_metadata": user.user_metadata or {},
            "app_metadata": user.app_metadata or {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, otherwise return None.
    Useful for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

