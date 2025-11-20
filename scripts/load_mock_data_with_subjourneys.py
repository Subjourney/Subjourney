#!/usr/bin/env python3
"""
Load mock journey data with subjourneys into Supabase database.

This script reads the mock JSON journey data with multiple journeys and subjourneys
and inserts it into the database for a specified team (by slug).
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
    mock_data_path = project_root / "mock-data" / "mock-journey-with-subjourneys-data.json"
    
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
    project_name = mock_data.get("project_name", "E-Commerce Platform")
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


def create_journey(
    supabase: Client,
    team_id: str,
    project_id: str,
    journey_data: Dict[str, Any],
    is_subjourney: bool = False,
    parent_step_id: Optional[str] = None
) -> Optional[str]:
    """Create journey from journey data."""
    journey_name = journey_data.get("name", "Untitled Journey")
    journey_description = journey_data.get("description", "")
    timestamp = get_timestamp()
    
    journey_type = "subjourney" if is_subjourney else "journey"
    print_data(f"Creating {journey_type}: {journey_name}")
    
    journey_insert_data = {
        "id": str(uuid4()),  # Always generate new UUID, ignore mock ID
        "name": journey_name,
        "description": journey_description,
        "summary": journey_data.get("summary", ""),
        "project_id": project_id,
        "team_id": team_id,
        "is_subjourney": is_subjourney,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    
    if parent_step_id:
        journey_insert_data["parent_step_id"] = parent_step_id
    
    try:
        response = supabase.table("journeys").insert(journey_insert_data).execute()
        if response.data:
            journey_id = response.data[0]["id"]
            print_success(f"{journey_type.capitalize()} created: {journey_name} (ID: {journey_id})")
            return journey_id
        else:
            print_error(f"Failed to create {journey_type}")
            return None
    except Exception as e:
        print_error(f"Failed to create {journey_type}: {str(e)}")
        return None


def create_phases(
    supabase: Client,
    team_id: str,
    journey_id: str,
    phases_data: List[Dict[str, Any]]
) -> Dict[str, str]:
    """Create phases from phases data."""
    phase_map = {}  # Maps phase name to phase ID
    timestamp = get_timestamp()
    
    for phase in phases_data:
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
    
    return phase_map


def create_steps(
    supabase: Client,
    team_id: str,
    phase_map: Dict[str, str],
    attribute_map: Dict[str, str],
    phases_data: List[Dict[str, Any]],
    journey_id: str,
    project_id: str
) -> Dict[str, Dict[str, Any]]:
    """Create steps from phases data. Returns step_map and subjourney_info."""
    step_map = {}  # Maps step name to step ID
    subjourney_info = {}  # Maps step name to subjourney data
    timestamp = get_timestamp()
    
    for phase in phases_data:
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
                    
                    # Check if step has a subjourney
                    if step.get("has_subjourney") and step.get("subjourney"):
                        subjourney_info[step_name] = {
                            "step_id": step_id,
                            "subjourney_data": step.get("subjourney")
                        }
                else:
                    print_error(f"Failed to create step: {step_name}")
            except Exception as e:
                print_error(f"Failed to create step: {step_name} - {str(e)}")
    
    return step_map, subjourney_info


def create_subjourney(
    supabase: Client,
    team_id: str,
    project_id: str,
    parent_step_id: str,
    subjourney_data: Dict[str, Any],
    attribute_map: Dict[str, str]
) -> Optional[str]:
    """Create a subjourney linked to a parent step."""
    print_data(f"Creating subjourney: {subjourney_data.get('name')}")
    
    # Create the subjourney journey
    subjourney_id = create_journey(
        supabase,
        team_id,
        project_id,
        subjourney_data,
        is_subjourney=True,
        parent_step_id=parent_step_id
    )
    
    if not subjourney_id:
        print_error("Failed to create subjourney journey")
        return None
    
    # Create phases for subjourney
    phases_data = subjourney_data.get("phases", [])
    phase_map = create_phases(supabase, team_id, subjourney_id, phases_data)
    
    # Create steps for subjourney and collect nested subjourney info
    step_map, nested_subjourney_info = create_steps(
        supabase,
        team_id,
        phase_map,
        attribute_map,
        phases_data,
        subjourney_id,
        project_id
    )
    
    # Recursively create nested subjourneys
    nested_count = 0
    for step_name, nested_subj_info in nested_subjourney_info.items():
        print()
        print_step(f"Creating nested subjourney for step: {step_name}")
        nested_subjourney_id = create_subjourney(
            supabase,
            team_id,
            project_id,
            nested_subj_info["step_id"],
            nested_subj_info["subjourney_data"],
            attribute_map
        )
        if nested_subjourney_id:
            nested_count += 1
    
    if nested_count > 0:
        print_success(f"Subjourney created with {len(phase_map)} phases, {len(step_map)} steps, and {nested_count} nested subjourney(s)")
    else:
        print_success(f"Subjourney created with {len(phase_map)} phases and {len(step_map)} steps")
    return subjourney_id


def process_journey(
    supabase: Client,
    team_id: str,
    project_id: str,
    journey_data: Dict[str, Any],
    attribute_map: Dict[str, str]
) -> Dict[str, int]:
    """Process a single journey (main or subjourney) and return stats."""
    stats = {
        "phases": 0,
        "steps": 0,
        "subjourneys": 0
    }
    
    journey_name = journey_data.get("name", "Untitled Journey")
    print()
    print_step(f"Processing journey: {journey_name}")
    
    # Create the journey
    is_subjourney = journey_data.get("is_subjourney", False)
    journey_id = create_journey(
        supabase,
        team_id,
        project_id,
        journey_data,
        is_subjourney=is_subjourney
    )
    
    if not journey_id:
        print_error(f"Failed to create journey: {journey_name}")
        return stats
    
    # Create phases
    phases_data = journey_data.get("phases", [])
    phase_map = create_phases(supabase, team_id, journey_id, phases_data)
    stats["phases"] = len(phase_map)
    
    # Create steps and collect subjourney info
    step_map, subjourney_info = create_steps(
        supabase,
        team_id,
        phase_map,
        attribute_map,
        phases_data,
        journey_id,
        project_id
    )
    stats["steps"] = len(step_map)
    
    # Create subjourneys
    for step_name, subj_info in subjourney_info.items():
        print()
        print_step(f"Creating subjourney for step: {step_name}")
        subjourney_id = create_subjourney(
            supabase,
            team_id,
            project_id,
            subj_info["step_id"],
            subj_info["subjourney_data"],
            attribute_map
        )
        if subjourney_id:
            stats["subjourneys"] += 1
    
    return stats


def display_summary(team_name: str, project_name: str, journey_stats: List[Dict[str, Any]]):
    """Display summary of created data."""
    print()
    print_success("🎉 Mock data loaded successfully!")
    print()
    print("📊 Summary:")
    print(f"   • Team: {team_name}")
    print(f"   • Project: {project_name}")
    print()
    
    total_phases = 0
    total_steps = 0
    total_subjourneys = 0
    
    for i, stats in enumerate(journey_stats, 1):
        journey_name = stats.get("journey_name", f"Journey {i}")
        phases = stats.get("phases", 0)
        steps = stats.get("steps", 0)
        subjourneys = stats.get("subjourneys", 0)
        
        total_phases += phases
        total_steps += steps
        total_subjourneys += subjourneys
        
        print(f"   • Journey {i}: {journey_name}")
        print(f"     - Phases: {phases}")
        print(f"     - Steps: {steps}")
        print(f"     - Subjourneys: {subjourneys}")
    
    print()
    print("📈 Totals:")
    print(f"   • Total Journeys: {len(journey_stats)}")
    print(f"   • Total Phases: {total_phases}")
    print(f"   • Total Steps: {total_steps}")
    print(f"   • Total Subjourneys: {total_subjourneys}")
    print()
    print("🚀 Your mock data is ready to use!")


def main():
    """Main execution function."""
    print()
    print_step("Starting mock data loading with subjourneys...")
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
    journeys = mock_data.get("journeys", [])
    print()
    print_step("Ready to load mock data")
    print("This will create:")
    print(f"  • 1 Project")
    print(f"  • {len(journeys)} Journeys")
    print("  • Multiple Phases")
    print("  • Multiple Steps")
    print("  • Team-level Attribute Definitions")
    print("  • Step Attributes")
    print("  • Subjourneys (linked to steps)")
    print()
    
    confirm = input("Proceed with loading mock data? (y/n): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print_warning("Mock data loading cancelled")
        sys.exit(0)
    
    # Create project
    project_id = create_project(supabase, team_id, mock_data)
    if not project_id:
        print_error("Failed to create project")
        sys.exit(1)
    
    project_name = mock_data.get("project_name", "E-Commerce Platform")
    
    # Create attributes
    attribute_map = create_attributes(supabase, team_id, mock_data)
    
    # Process each journey
    journey_stats = []
    for journey_data in journeys:
        stats = process_journey(
            supabase,
            team_id,
            project_id,
            journey_data,
            attribute_map
        )
        stats["journey_name"] = journey_data.get("name", "Untitled Journey")
        journey_stats.append(stats)
    
    # Display summary
    display_summary(team_name, project_name, journey_stats)


if __name__ == "__main__":
    main()

