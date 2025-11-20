#!/usr/bin/env python3
"""
Load mock journey data into Supabase database.

This script reads the mock JSON journey data and inserts it into the database
for a specified team (by slug).
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from uuid import uuid4

# Add backend to path to import Supabase client
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from supabase import create_client, Client
from app.config import get_settings

# Colors for terminal output
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

def print_status(msg: str):
    print(f"{Colors.BLUE}→{Colors.NC} {msg}")

def print_success(msg: str):
    print(f"{Colors.GREEN}✓{Colors.NC} {msg}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠{Colors.NC} {msg}")

def print_error(msg: str):
    print(f"{Colors.RED}✗{Colors.NC} {msg}")

def print_step(msg: str):
    print(f"{Colors.PURPLE}▶{Colors.NC} {msg}")

def print_data(msg: str):
    print(f"{Colors.CYAN}📊{Colors.NC} {msg}")


def get_team_slug() -> str:
    """Prompt user for team slug."""
    print_step("Team Selection")
    print()
    print("Please enter the team slug where you want to load the mock data.")
    print("The team must already exist in your Supabase database.")
    print()
    
    while True:
        team_slug = input("Enter team slug (e.g., 'toms-team'): ").strip()
        
        if not team_slug:
            print_error("Team slug cannot be empty.")
            continue
        
        # Validate slug format
        if not all(c.isalnum() or c == '-' for c in team_slug):
            print_error("Invalid slug format. Use only lowercase letters, numbers, and hyphens.")
            continue
        
        return team_slug.lower()


def verify_team_exists(supabase: Client, team_slug: str) -> Optional[Dict[str, Any]]:
    """Verify team exists and return team data."""
    print_status("Verifying team exists...")
    
    try:
        response = supabase.table("teams").select("*").eq("slug", team_slug).execute()
        
        if not response.data or len(response.data) == 0:
            print_error(f"Team with slug '{team_slug}' not found!")
            print_status("Please create this team first or check the slug spelling.")
            return None
        
        team = response.data[0]
        print_success(f"Found team: {team['name']} (ID: {team['id']})")
        return team
    
    except Exception as e:
        print_error(f"Failed to verify team: {str(e)}")
        return None


def get_timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.utcnow().isoformat() + "Z"


def load_mock_data() -> Dict[str, Any]:
    """Load mock JSON data from file."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    mock_data_path = project_root / "mock-data" / "mock-journey-data.json"
    
    if not mock_data_path.exists():
        print_error(f"Mock data file not found: {mock_data_path}")
        sys.exit(1)
    
    print_status(f"Loading mock data from: {mock_data_path}")
    
    with open(mock_data_path, 'r') as f:
        data = json.load(f)
    
    print_success("Mock data loaded successfully")
    return data


def create_project(supabase: Client, team_id: str, mock_data: Dict[str, Any]) -> Optional[str]:
    """Create project from mock data."""
    project_name = mock_data.get("project_name", "Coffee Shop Experience")
    timestamp = get_timestamp()
    
    print_data(f"Creating project: {project_name}")
    
    project_data = {
        "id": str(uuid4()),
        "name": project_name,
        "description": f"Project for {project_name}",
        "team_id": team_id,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    
    try:
        response = supabase.table("projects").insert(project_data).execute()
        if response.data:
            project_id = response.data[0]["id"]
            print_success(f"Project created: {project_name} (ID: {project_id})")
            return project_id
        else:
            print_error("Failed to create project")
            return None
    except Exception as e:
        print_error(f"Failed to create project: {str(e)}")
        return None


def create_journey(supabase: Client, team_id: str, project_id: str, mock_data: Dict[str, Any]) -> Optional[str]:
    """Create journey from mock data."""
    journey_name = mock_data.get("name", "Customer Coffee Order Journey")
    journey_description = mock_data.get("description", "")
    timestamp = get_timestamp()
    
    print_data(f"Creating journey: {journey_name}")
    
    journey_data = {
        "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
        "name": journey_name,
        "description": journey_description,
        "summary": mock_data.get("summary", ""),
        "project_id": project_id,
        "team_id": team_id,
        "is_subjourney": mock_data.get("is_subjourney", False),
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    
    try:
        response = supabase.table("journeys").insert(journey_data).execute()
        if response.data:
            journey_id = response.data[0]["id"]
            print_success(f"Journey created: {journey_name} (ID: {journey_id})")
            return journey_id
        else:
            print_error("Failed to create journey")
            return None
    except Exception as e:
        print_error(f"Failed to create journey: {str(e)}")
        return None


def create_attributes(supabase: Client, team_id: str, mock_data: Dict[str, Any]) -> Dict[str, str]:
    """Create team-level attribute definitions from mock data."""
    print_data("Creating team-level attribute definitions...")
    
    available_attributes = mock_data.get("available_attributes", [])
    attribute_map = {}  # Maps attribute name to attribute definition ID
    timestamp = get_timestamp()
    
    for attr in available_attributes:
        attr_name = attr.get("name")
        attr_type = attr.get("type")
        attr_description = attr.get("description", "")
        
        print_status(f"Creating attribute: {attr_name} ({attr_type})")
        
        attr_data = {
            "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
            "name": attr_name,
            "description": attr_description,
            "type": attr_type,
            "team_id": team_id,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        
        try:
            response = supabase.table("attributes").insert(attr_data).execute()
            if response.data:
                attr_id = response.data[0]["id"]
                attribute_map[attr_name] = attr_id
                print_success(f"Attribute created: {attr_name} (ID: {attr_id})")
            else:
                print_warning(f"Failed to create attribute: {attr_name}")
        except Exception as e:
            # Attribute might already exist, try to get it
            try:
                response = supabase.table("attributes").select("id").eq("name", attr_name).eq("team_id", team_id).execute()
                if response.data and len(response.data) > 0:
                    attr_id = response.data[0]["id"]
                    attribute_map[attr_name] = attr_id
                    print_warning(f"Attribute already exists: {attr_name} (ID: {attr_id})")
                else:
                    print_error(f"Failed to create/get attribute: {attr_name} - {str(e)}")
            except Exception as e2:
                print_error(f"Failed to create/get attribute: {attr_name} - {str(e2)}")
    
    print_success(f"Created {len(attribute_map)} attribute definitions")
    return attribute_map


def create_phases(supabase: Client, team_id: str, journey_id: str, mock_data: Dict[str, Any]) -> Dict[str, str]:
    """Create phases from mock data."""
    print_data("Creating phases...")
    
    phases = mock_data.get("phases", [])
    phase_map = {}  # Maps phase name to phase ID
    timestamp = get_timestamp()
    
    for phase in phases:
        phase_name = phase.get("name")
        phase_color = phase.get("color", "#3B82F6")
        sequence_order = phase.get("sequence_order", 1)
        
        print_status(f"Creating phase: {phase_name}")
        
        phase_data = {
            "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
            "name": phase_name,
            "journey_id": journey_id,
            "team_id": team_id,
            "sequence_order": sequence_order,
            "color": phase_color,
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        
        try:
            response = supabase.table("phases").insert(phase_data).execute()
            if response.data:
                phase_id = response.data[0]["id"]
                phase_map[phase_name] = phase_id
                print_success(f"Phase created: {phase_name} (ID: {phase_id})")
            else:
                print_error(f"Failed to create phase: {phase_name}")
        except Exception as e:
            print_error(f"Failed to create phase: {phase_name} - {str(e)}")
    
    print_success(f"Created {len(phase_map)} phases")
    return phase_map


def create_steps(
    supabase: Client,
    team_id: str,
    phase_map: Dict[str, str],
    attribute_map: Dict[str, str],
    mock_data: Dict[str, Any]
) -> Dict[str, str]:
    """Create steps from mock data."""
    print_data("Creating steps...")
    
    phases = mock_data.get("phases", [])
    step_map = {}  # Maps step name to step ID
    timestamp = get_timestamp()
    
    for phase in phases:
        phase_name = phase.get("name")
        phase_id = phase_map.get(phase_name)
        
        if not phase_id:
            print_warning(f"Phase not found: {phase_name}, skipping steps")
            continue
        
        steps = phase.get("steps", [])
        
        for step in steps:
            step_name = step.get("name")
            step_description = step.get("description", "")
            sequence_order = step.get("sequence_order", 1)
            
            print_status(f"Creating step: {step_name}")
            
            step_data = {
                "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
                "name": step_name,
                "description": step_description,
                "phase_id": phase_id,
                "team_id": team_id,
                "sequence_order": sequence_order,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            
            try:
                response = supabase.table("steps").insert(step_data).execute()
                if response.data:
                    step_id = response.data[0]["id"]
                    step_map[step_name] = step_id
                    print_success(f"Step created: {step_name} (ID: {step_id})")
                    
                    # Create step attributes
                    step_attributes = step.get("attributes", [])
                    for attr in step_attributes:
                        attr_name = attr.get("attribute_name")
                        attr_def_id = attribute_map.get(attr_name)
                        
                        if attr_def_id:
                            step_attr_data = {
                                "id": str(uuid4()),
                                "step_id": step_id,
                                "attribute_definition_id": attr_def_id,
                                "sequence_order": attr.get("sequence_order", 1),
                                "relationship_type": attr.get("relationship_type", "primary"),
                                "created_at": timestamp,
                                "updated_at": timestamp,
                            }
                            
                            try:
                                supabase.table("step_attributes").insert(step_attr_data).execute()
                                print_success(f"  ✓ Assigned attribute: {attr_name}")
                            except Exception as e:
                                print_warning(f"  ⚠ Failed to assign attribute: {attr_name} - {str(e)}")
                        else:
                            print_warning(f"  ⚠ Attribute definition not found: {attr_name}")
                else:
                    print_error(f"Failed to create step: {step_name}")
            except Exception as e:
                print_error(f"Failed to create step: {step_name} - {str(e)}")
    
    print_success(f"Created {len(step_map)} steps")
    return step_map


def create_cards(
    supabase: Client,
    team_id: str,
    step_map: Dict[str, str],
    mock_data: Dict[str, Any]
) -> int:
    """Create cards from mock data."""
    print_data("Creating cards...")
    
    phases = mock_data.get("phases", [])
    card_count = 0
    timestamp = get_timestamp()
    
    for phase in phases:
        steps = phase.get("steps", [])
        
        for step in steps:
            step_name = step.get("name")
            step_id = step_map.get(step_name)
            
            if not step_id:
                continue
            
            cards = step.get("cards", [])
            
            for card in cards:
                card_name = card.get("name", "Untitled Card")
                card_type = card.get("card_type", "note")
                
                print_status(f"Creating card: {card_name} (type: {card_type})")
                
                card_data = {
                    "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
                    "name": card_name,
                    "step_id": step_id,
                    "team_id": team_id,
                    "card_type_id": card.get("card_type_id"),  # Will need to create card types first
                    "sequence_order": card.get("sequence_order", 1),
                    "data": card.get("data", {}),
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                
                # Remove None values
                card_data = {k: v for k, v in card_data.items() if v is not None}
                
                try:
                    response = supabase.table("cards").insert(card_data).execute()
                    if response.data:
                        card_count += 1
                        print_success(f"Card created: {card_name}")
                    else:
                        print_warning(f"Failed to create card: {card_name}")
                except Exception as e:
                    print_warning(f"Failed to create card: {card_name} - {str(e)}")
    
    print_success(f"Created {card_count} cards")
    return card_count


def display_summary(team_name: str, project_name: str, journey_name: str, stats: Dict[str, int]):
    """Display summary of created data."""
    print()
    print_success("🎉 Mock data loaded successfully!")
    print()
    print("📊 Summary:")
    print(f"   • Team: {team_name}")
    print(f"   • Project: {project_name}")
    print(f"   • Journey: {journey_name}")
    print(f"   • Phases: {stats.get('phases', 0)}")
    print(f"   • Steps: {stats.get('steps', 0)}")
    print(f"   • Attributes: {stats.get('attributes', 0)}")
    print(f"   • Cards: {stats.get('cards', 0)}")
    print()
    print("🚀 Your mock data is ready to use!")


def main():
    """Main execution function."""
    print()
    print_step("Starting mock data loading...")
    print()
    
    # Get settings
    settings = get_settings()
    
    # Initialize Supabase client
    print_status("Initializing Supabase client...")
    try:
        supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
        print_success("Supabase client initialized")
    except Exception as e:
        print_error(f"Failed to initialize Supabase client: {str(e)}")
        sys.exit(1)
    
    # Get team slug from user
    team_slug = get_team_slug()
    
    # Verify team exists
    team = verify_team_exists(supabase, team_slug)
    if not team:
        sys.exit(1)
    
    team_id = team["id"]
    team_name = team["name"]
    
    # Load mock data
    mock_data = load_mock_data()
    
    # Confirm creation
    print()
    print_step("Ready to load mock data")
    print("This will create:")
    print("  • 1 Project")
    print("  • 1 Journey")
    print("  • Multiple Phases")
    print("  • Multiple Steps")
    print("  • Team-level Attribute Definitions")
    print("  • Step Attributes")
    print("  • Cards")
    print()
    
    confirm = input("Proceed with loading mock data? (y/n): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print_warning("Mock data loading cancelled")
        sys.exit(0)
    
    # Create data
    stats = {}
    
    # Create project
    project_id = create_project(supabase, team_id, mock_data)
    if not project_id:
        print_error("Failed to create project")
        sys.exit(1)
    
    # Create journey
    journey_id = create_journey(supabase, team_id, project_id, mock_data)
    if not journey_id:
        print_error("Failed to create journey")
        sys.exit(1)
    
    # Create attributes
    attribute_map = create_attributes(supabase, team_id, mock_data)
    stats['attributes'] = len(attribute_map)
    
    # Create phases
    phase_map = create_phases(supabase, team_id, journey_id, mock_data)
    stats['phases'] = len(phase_map)
    
    # Create steps
    step_map = create_steps(supabase, team_id, phase_map, attribute_map, mock_data)
    stats['steps'] = len(step_map)
    
    # Create cards
    card_count = create_cards(supabase, team_id, step_map, mock_data)
    stats['cards'] = card_count
    
    # Display summary
    project_name = mock_data.get("project_name", "Coffee Shop Experience")
    journey_name = mock_data.get("name", "Customer Coffee Order Journey")
    display_summary(team_name, project_name, journey_name, stats)


if __name__ == "__main__":
    main()

