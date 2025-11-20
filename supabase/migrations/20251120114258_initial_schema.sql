-- =============================================================================
-- Subjourney Database Schema Migration
-- Refined schema with proper parent-child relationships and subjourney support
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE BUSINESS ENTITIES
-- =============================================================================

-- Teams table (Root level)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team memberships (Junction: auth.users ↔ teams)
CREATE TABLE team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' NOT NULL,
    is_owner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Projects table (Team-scoped)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journeys table (Project-scoped, can be subjourney)
-- Note: parent_step_id references steps(id) but steps table doesn't exist yet
-- We'll add this constraint after creating steps table
CREATE TABLE journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    summary TEXT,
    is_subjourney BOOLEAN DEFAULT FALSE,
    parent_step_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT journeys_subjourney_check CHECK (
        (is_subjourney = FALSE AND parent_step_id IS NULL) OR
        (is_subjourney = TRUE)
    )
);

-- Phases table (Journey-scoped, horizontal grouping)
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Steps table (Phase-scoped, individual touchpoints)
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    last_comment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add the foreign key constraint for journeys.parent_step_id
ALTER TABLE journeys ADD CONSTRAINT journeys_parent_step_id_fkey 
    FOREIGN KEY (parent_step_id) REFERENCES steps(id) ON DELETE SET NULL;

-- =============================================================================
-- ATTRIBUTE SYSTEM
-- =============================================================================
-- Attributes are DEFINITIONS at team/project level
-- Attribute INSTANCES exist on steps via step_attributes junction table

-- Attributes table (Definitions - team or project scoped)
CREATE TABLE attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('actor', 'action', 'thing', 'channel', 'system', 'place', 'word')),
    description TEXT,
    allowed_values JSONB,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT attributes_scope_check CHECK (
        team_id IS NOT NULL
    )
);

-- Step attributes (Junction: steps ↔ attributes - INSTANCES on steps)
CREATE TABLE step_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    attribute_definition_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    relationship_type VARCHAR(50) DEFAULT 'primary',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personas table (Linked to actor-type attributes)
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_definition_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    characteristics JSONB DEFAULT '{}',
    demographics JSONB DEFAULT '{}',
    psychographics JSONB DEFAULT '{}',
    behaviors JSONB DEFAULT '{}',
    needs JSONB DEFAULT '{}',
    goals JSONB DEFAULT '{}',
    motivations JSONB DEFAULT '{}',
    frustrations JSONB DEFAULT '{}',
    pain_points JSONB DEFAULT '{}',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    sequence_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for personas (actor type only)
-- Note: PostgreSQL doesn't support CHECK constraints that reference other tables directly
-- This will be enforced at application level or via trigger
COMMENT ON TABLE personas IS 'Personas must be linked to attributes where type = actor';

-- =============================================================================
-- CARD SYSTEM (Modular, plugin-based)
-- =============================================================================

-- Modules table (Plugin modules)
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    icon VARCHAR(100),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card types table (Card type definitions within modules)
CREATE TABLE card_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7),
    schema JSONB NOT NULL,
    ui_config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_id, name)
);

-- Cards table (Step-scoped, modular content)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    card_type_id UUID NOT NULL REFERENCES card_types(id) ON DELETE SET NULL,
    data JSONB DEFAULT '{}',
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card integrations table (External integrations)
CREATE TABLE card_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    integration_type VARCHAR(100) NOT NULL,
    external_id VARCHAR(500) NOT NULL,
    external_url TEXT,
    external_data JSONB DEFAULT '{}',
    sync_status VARCHAR(50) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(card_id, integration_type, external_id)
);

-- Team module settings (Team-specific module configuration)
CREATE TABLE team_module_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, module_id)
);

-- =============================================================================
-- FLOW SYSTEM
-- =============================================================================

-- Flows table (Sequences of steps)
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flow steps (Junction: flows ↔ steps)
CREATE TABLE flow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(flow_id, step_id)
);

-- =============================================================================
-- COMMENT SYSTEM
-- =============================================================================

-- Comments table (Polymorphic: journey, phase, step, card)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('journey', 'phase', 'step', 'card')),
    target_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment reactions table
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL CHECK (reaction IN ('👍', '❤️', '😂', '😮')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Team-related indexes
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_teams_slug ON teams(slug);

-- Project-related indexes
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- Journey-related indexes
CREATE INDEX idx_journeys_team_id ON journeys(team_id);
CREATE INDEX idx_journeys_project_id ON journeys(project_id);
CREATE INDEX idx_journeys_parent_step_id ON journeys(parent_step_id);
CREATE INDEX idx_journeys_is_subjourney ON journeys(is_subjourney);

-- Phase-related indexes
CREATE INDEX idx_phases_team_id ON phases(team_id);
CREATE INDEX idx_phases_journey_id ON phases(journey_id);
CREATE INDEX idx_phases_sequence ON phases(journey_id, sequence_order);

-- Step-related indexes
CREATE INDEX idx_steps_team_id ON steps(team_id);
CREATE INDEX idx_steps_phase_id ON steps(phase_id);
CREATE INDEX idx_steps_sequence ON steps(phase_id, sequence_order);

-- Card-related indexes
CREATE INDEX idx_cards_team_id ON cards(team_id);
CREATE INDEX idx_cards_step_id ON cards(step_id);
CREATE INDEX idx_cards_sequence ON cards(step_id, sequence_order);
CREATE INDEX idx_cards_card_type_id ON cards(card_type_id);

-- Attribute system indexes
CREATE INDEX idx_attributes_team_id ON attributes(team_id);
CREATE INDEX idx_attributes_project_id ON attributes(project_id);
CREATE INDEX idx_attributes_type ON attributes(type);
CREATE INDEX idx_step_attributes_step_id ON step_attributes(step_id);
CREATE INDEX idx_step_attributes_attribute_id ON step_attributes(attribute_definition_id);
CREATE INDEX idx_personas_attribute_id ON personas(attribute_definition_id);
CREATE INDEX idx_personas_team_id ON personas(team_id);

-- Card system indexes
CREATE INDEX idx_modules_name ON modules(name);
CREATE INDEX idx_modules_enabled ON modules(enabled);
CREATE INDEX idx_card_types_module_id ON card_types(module_id);
CREATE INDEX idx_card_types_enabled ON card_types(enabled);
CREATE INDEX idx_card_integrations_card_id ON card_integrations(card_id);
CREATE INDEX idx_card_integrations_sync_status ON card_integrations(sync_status);
CREATE INDEX idx_team_module_settings_team_id ON team_module_settings(team_id);

-- Flow system indexes
CREATE INDEX idx_flows_team_id ON flows(team_id);
CREATE INDEX idx_flows_project_id ON flows(project_id);
CREATE INDEX idx_flows_journey_id ON flows(journey_id);
CREATE INDEX idx_flow_steps_flow_id ON flow_steps(flow_id);
CREATE INDEX idx_flow_steps_step_id ON flow_steps(step_id);
CREATE INDEX idx_flow_steps_sequence ON flow_steps(flow_id, sequence_order);

-- Comment system indexes
CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_memberships_updated_at BEFORE UPDATE ON team_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journeys_updated_at BEFORE UPDATE ON journeys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attributes_updated_at BEFORE UPDATE ON attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_step_attributes_updated_at BEFORE UPDATE ON step_attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_card_types_updated_at BEFORE UPDATE ON card_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_card_integrations_updated_at BEFORE UPDATE ON card_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_module_settings_updated_at BEFORE UPDATE ON team_module_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flow_steps_updated_at BEFORE UPDATE ON flow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGERS FOR DENORMALIZED FIELDS
-- =============================================================================

-- Function to update step comment count
CREATE OR REPLACE FUNCTION update_step_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.target_type = 'step' THEN
        UPDATE steps 
        SET comment_count = comment_count + 1,
            last_comment_at = NOW()
        WHERE id = NEW.target_id;
    ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'step' THEN
        UPDATE steps 
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE id = OLD.target_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment count updates
CREATE TRIGGER trigger_update_step_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_step_comment_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Team-based access policies (simplified - can be refined)
-- Teams: Users can view teams they're members of
CREATE POLICY "Users can view their teams" ON teams
    FOR SELECT USING (
        id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Team memberships: Users can view their own memberships
CREATE POLICY "Users can view their memberships" ON team_memberships
    FOR SELECT USING (user_id = auth.uid());

-- Projects: Team members can access
CREATE POLICY "Team members can access projects" ON projects
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Journeys: Team members can access
CREATE POLICY "Team members can access journeys" ON journeys
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Phases: Team members can access
CREATE POLICY "Team members can access phases" ON phases
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Steps: Team members can access
CREATE POLICY "Team members can access steps" ON steps
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Attributes: Team members can access
CREATE POLICY "Team members can access attributes" ON attributes
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Step attributes: Team members can access
CREATE POLICY "Team members can access step attributes" ON step_attributes
    FOR ALL USING (
        step_id IN (
            SELECT s.id FROM steps s
            WHERE s.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
        )
    );

-- Personas: Team members can access
CREATE POLICY "Team members can access personas" ON personas
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Modules: All authenticated users can view
CREATE POLICY "Authenticated users can view modules" ON modules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Card types: All authenticated users can view
CREATE POLICY "Authenticated users can view card types" ON card_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Cards: Team members can access
CREATE POLICY "Team members can access cards" ON cards
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Card integrations: Team members can access
CREATE POLICY "Team members can access card integrations" ON card_integrations
    FOR ALL USING (
        card_id IN (
            SELECT c.id FROM cards c
            WHERE c.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
        )
    );

-- Team module settings: Team members can access
CREATE POLICY "Team members can access module settings" ON team_module_settings
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Flows: Team members can access
CREATE POLICY "Team members can access flows" ON flows
    FOR ALL USING (
        team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
    );

-- Flow steps: Team members can access
CREATE POLICY "Team members can access flow steps" ON flow_steps
    FOR ALL USING (
        flow_id IN (
            SELECT f.id FROM flows f
            WHERE f.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
        )
    );

-- Comments: Team members can view/create, authors can update/delete
CREATE POLICY "Team members can view comments" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM (
                -- For steps
                SELECT s.id FROM steps s 
                JOIN phases p ON s.phase_id = p.id 
                JOIN journeys j ON p.journey_id = j.id 
                WHERE s.id = comments.target_id::uuid 
                AND comments.target_type = 'step'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                -- For phases
                SELECT p.id FROM phases p
                JOIN journeys j ON p.journey_id = j.id 
                WHERE p.id = comments.target_id::uuid 
                AND comments.target_type = 'phase'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                -- For journeys
                SELECT j.id FROM journeys j
                WHERE j.id = comments.target_id::uuid 
                AND comments.target_type = 'journey'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                -- For cards
                SELECT c.id FROM cards c
                WHERE c.id = comments.target_id::uuid 
                AND comments.target_type = 'card'
                AND c.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
            ) accessible_entities
        )
    );

CREATE POLICY "Team members can create comments" ON comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM (
                SELECT s.id FROM steps s 
                JOIN phases p ON s.phase_id = p.id 
                JOIN journeys j ON p.journey_id = j.id 
                WHERE s.id = comments.target_id::uuid 
                AND comments.target_type = 'step'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                SELECT p.id FROM phases p
                JOIN journeys j ON p.journey_id = j.id 
                WHERE p.id = comments.target_id::uuid 
                AND comments.target_type = 'phase'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                SELECT j.id FROM journeys j
                WHERE j.id = comments.target_id::uuid 
                AND comments.target_type = 'journey'
                AND j.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
                UNION
                SELECT c.id FROM cards c
                WHERE c.id = comments.target_id::uuid 
                AND comments.target_type = 'card'
                AND c.team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid())
            ) accessible_entities
        )
    );

CREATE POLICY "Authors can update their comments" ON comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their comments" ON comments
    FOR DELETE USING (author_id = auth.uid());

-- Comment reactions: Team members can view/add, users can remove their own
CREATE POLICY "Team members can view reactions" ON comment_reactions
    FOR SELECT USING (
        comment_id IN (SELECT id FROM comments)
    );

CREATE POLICY "Users can add reactions" ON comment_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        comment_id IN (SELECT id FROM comments)
    );

CREATE POLICY "Users can remove their reactions" ON comment_reactions
    FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE teams IS 'Multi-tenant organization units';
COMMENT ON TABLE team_memberships IS 'Junction table linking users to teams with roles';
COMMENT ON TABLE projects IS 'Grouping of journeys within a team';
COMMENT ON TABLE journeys IS 'Main journey maps (can be subjourneys via parent_step_id)';
COMMENT ON TABLE phases IS 'Horizontal grouping within a journey';
COMMENT ON TABLE steps IS 'Individual touchpoints within a phase';
COMMENT ON TABLE attributes IS 'Attribute definitions at team or project level';
COMMENT ON TABLE step_attributes IS 'Junction table linking steps to attribute instances';
COMMENT ON TABLE personas IS 'User personas linked to actor-type attributes';
COMMENT ON TABLE modules IS 'Plugin modules that provide card types';
COMMENT ON TABLE card_types IS 'Card type definitions with JSON Schema validation';
COMMENT ON TABLE cards IS 'Modular cards attached to steps';
COMMENT ON TABLE flows IS 'Sequences of steps demonstrating specific paths';
COMMENT ON TABLE flow_steps IS 'Junction table linking flows to steps with ordering';
COMMENT ON TABLE comments IS 'Polymorphic comments on journeys, phases, steps, and cards';
COMMENT ON TABLE comment_reactions IS 'Emoji reactions on comments';

COMMENT ON COLUMN journeys.parent_step_id IS 'References the step that contains this subjourney. Only set for is_subjourney=true journeys.';
COMMENT ON COLUMN attributes.team_id IS 'Always required - attributes are team-scoped (project_id is optional for project-specific attributes)';
COMMENT ON COLUMN step_attributes.attribute_definition_id IS 'References attributes.id - creates an instance of the attribute on the step';
COMMENT ON COLUMN comments.target_type IS 'Type of entity: journey, phase, step, or card';
COMMENT ON COLUMN comments.target_id IS 'UUID of the target entity';
COMMENT ON COLUMN cards.data IS 'Card data validated against card_type.schema';
COMMENT ON COLUMN card_types.schema IS 'JSON Schema for validating card.data';

