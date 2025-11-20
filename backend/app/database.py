"""Supabase database client utilities."""
from typing import Optional
from supabase import create_client, Client
from .config import get_settings

settings = get_settings()

# Lazy-initialized Supabase clients
_supabase_admin: Optional[Client] = None
_supabase_anon: Optional[Client] = None


def get_supabase_admin() -> Client:
    """Get Supabase admin client (bypasses RLS)."""
    global _supabase_admin
    if _supabase_admin is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("Missing required Supabase environment variables")
        _supabase_admin = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _supabase_admin


def get_supabase_anon() -> Client:
    """Get Supabase anonymous client (respects RLS)."""
    global _supabase_anon
    if _supabase_anon is None:
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise ValueError("Missing required Supabase environment variables")
        _supabase_anon = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _supabase_anon


def get_supabase_client() -> Client:
    """Get default Supabase client (alias for admin client)."""
    return get_supabase_admin()

