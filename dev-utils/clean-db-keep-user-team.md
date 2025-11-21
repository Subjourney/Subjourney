-- =============================================================================
-- Delete All Data Except Users and Teams
-- =============================================================================
-- This script deletes all data from the database except:
--   - auth.users (user accounts)
--   - teams (team records)
--   - team_memberships (user-team relationships)
--
-- WARNING: This will permanently delete all projects, journeys, phases, steps,
--          cards, attributes, comments, flows, and all other data!
-- =============================================================================

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = 'replica';

-- Delete in order to respect foreign key constraints (child tables first)

-- Comment reactions (references comments)
DELETE FROM comment_reactions;

-- Comments (references various entities)
DELETE FROM comments;

-- Flow steps (references flows and steps)
DELETE FROM flow_steps;

-- Flows (references projects, journeys)
DELETE FROM flows;

-- Team module settings (references teams and modules)
DELETE FROM team_module_settings;

-- Card integrations (references cards)
DELETE FROM card_integrations;

-- Cards (references steps, card_types)
DELETE FROM cards;

-- Step attributes (references steps and attributes)
DELETE FROM step_attributes;

-- Personas (references attributes)
DELETE FROM personas;

-- Attributes (references teams, projects)
DELETE FROM attributes;

-- Steps (references phases)
DELETE FROM steps;

-- Phases (references journeys)
DELETE FROM phases;

-- Journeys (references projects, teams, steps)
-- Note: parent_step_id will be set to NULL due to ON DELETE SET NULL
DELETE FROM journeys;

-- Projects (references teams)
DELETE FROM projects;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================================================
-- Verification queries (uncomment to check)
-- =============================================================================

-- SELECT COUNT(*) as remaining_users FROM auth.users;
-- SELECT COUNT(*) as remaining_teams FROM teams;
-- SELECT COUNT(*) as remaining_memberships FROM team_memberships;
-- SELECT COUNT(*) as remaining_projects FROM projects;
-- SELECT COUNT(*) as remaining_journeys FROM journeys;
-- SELECT COUNT(*) as remaining_phases FROM phases;
-- SELECT COUNT(*) as remaining_steps FROM steps;
-- SELECT COUNT(*) as remaining_attributes FROM attributes;
-- SELECT COUNT(*) as remaining_cards FROM cards;
-- SELECT COUNT(*) as remaining_comments FROM comments;
-- SELECT COUNT(*) as remaining_flows FROM flows;