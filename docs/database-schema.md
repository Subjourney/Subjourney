# Database Schema

## Overview

The Subjourney database schema is designed with a clear hierarchy and bidirectional relationships to support efficient navigation between parent and child entities. The schema emphasizes team-based access control, subjourney support, and a modular card system.

## Core Hierarchy

```
Team → Project → Journey → Phase → Step → Card
```

Each level maintains a reference to its parent and includes `team_id` for efficient team-scoped queries and Row Level Security (RLS) policies.

## Core Entities

### Teams
- **Purpose**: Multi-tenant organization units
- **Key Fields**: `id`, `name`, `slug` (unique), `description`, `image_url`
- **Relationships**: Root of the hierarchy

### Team Memberships
- **Purpose**: Junction table linking `auth.users` to teams
- **Key Fields**: `user_id`, `team_id`, `role`, `is_owner`
- **Constraints**: `UNIQUE(user_id, team_id)`

### Projects
- **Purpose**: Grouping of journeys within a team
- **Key Fields**: `id`, `team_id`, `name`, `description`
- **Relationships**: `team_id → teams(id)`

### Journeys
- **Purpose**: Main journey maps (can be subjourneys)
- **Key Fields**: `id`, `team_id`, `project_id`, `name`, `is_subjourney`, `parent_step_id`
- **Relationships**: 
  - `team_id → teams(id)`
  - `project_id → projects(id)`
  - `parent_step_id → steps(id)` (for subjourneys)
- **Subjourney Pattern**: When `is_subjourney = true`, `parent_step_id` references the step that contains this subjourney

### Phases
- **Purpose**: Horizontal grouping within a journey
- **Key Fields**: `id`, `team_id`, `journey_id`, `name`, `sequence_order`, `color`
- **Relationships**: `journey_id → journeys(id)`
- **Ordering**: `sequence_order` determines display order within journey

### Steps
- **Purpose**: Individual touchpoints within a phase
- **Key Fields**: `id`, `team_id`, `phase_id`, `name`, `description`, `sequence_order`
- **Denormalized Fields**: `comment_count`, `last_comment_at` (updated via triggers)
- **Relationships**: `phase_id → phases(id)`
- **Ordering**: `sequence_order` determines display order within phase

### Cards
- **Purpose**: Modular cards attached to steps
- **Key Fields**: `id`, `team_id`, `step_id`, `card_type_id`, `data` (JSONB), `sequence_order`
- **Relationships**: 
  - `step_id → steps(id)`
  - `card_type_id → card_types(id)`
- **Data Validation**: `data` field is validated against `card_type.schema` (JSON Schema)

## Attribute System

### Attributes (Definitions)
- **Purpose**: Attribute definitions at team or project level
- **Key Fields**: `id`, `team_id`, `project_id` (optional), `name`, `type`, `allowed_values`
- **Types**: `'actor' | 'action' | 'thing' | 'channel' | 'system' | 'place' | 'word'`
- **Scope**: 
  - `team_id` is always required
  - `project_id` is optional (for project-specific attributes)
- **Usage**: These are the definitions that can be applied to steps

### Step Attributes (Instances)
- **Purpose**: Junction table linking steps to attribute instances
- **Key Fields**: `step_id`, `attribute_definition_id`, `sequence_order`, `relationship_type`
- **Relationships**: 
  - `step_id → steps(id)`
  - `attribute_definition_id → attributes(id)`
- **Usage**: Creates an instance of an attribute definition on a step
- **Note**: This is what AttributeComposer works with - it allows selecting from team/project attribute definitions and creating instances on steps

### Personas
- **Purpose**: User personas linked to actor-type attributes
- **Key Fields**: `id`, `attribute_definition_id`, `team_id`, `name`, various JSONB fields
- **Relationships**: `attribute_definition_id → attributes(id)` where `type = 'actor'`
- **Constraint**: Must reference an attribute with `type = 'actor'`

## Card System

### Modules
- **Purpose**: Plugin modules that provide card types
- **Key Fields**: `id`, `name` (unique), `display_name`, `version`, `enabled`, `config`
- **Examples**: `'blueprint'`, `'jira'`, `'persona_insights'`

### Card Types
- **Purpose**: Card type definitions within modules
- **Key Fields**: `id`, `module_id`, `name`, `schema` (JSON Schema), `ui_config`
- **Relationships**: `module_id → modules(id)`
- **Validation**: `cards.data` is validated against `card_type.schema`

### Cards
- **Purpose**: Modular cards attached to steps
- **Key Fields**: `id`, `step_id`, `card_type_id`, `data` (JSONB), `sequence_order`
- **Data**: Validated JSONB structure matching the card type's schema

## Flow System

### Flows
- **Purpose**: Sequences of steps demonstrating specific paths
- **Key Fields**: `id`, `team_id`, `project_id`, `journey_id`, `name`, `description`
- **Relationships**: Links to project and optionally a specific journey

### Flow Steps
- **Purpose**: Junction table linking flows to steps with ordering
- **Key Fields**: `flow_id`, `step_id`, `sequence_order`
- **Relationships**: Many-to-many between flows and steps
- **Constraint**: `UNIQUE(flow_id, step_id)` prevents duplicate steps in same flow

## Comment System

### Comments
- **Purpose**: Polymorphic comments on journeys, phases, steps, and cards
- **Key Fields**: `id`, `author_id`, `target_type`, `target_id`, `content`, `parent_comment_id`
- **Polymorphic**: Uses `target_type` + `target_id` to reference different entity types
- **Threading**: `parent_comment_id` enables nested comment threads

### Comment Reactions
- **Purpose**: Emoji reactions on comments
- **Key Fields**: `comment_id`, `user_id`, `reaction`
- **Reactions**: `'👍' | '❤️' | '😂' | '😮'`
- **Constraint**: `UNIQUE(comment_id, user_id, reaction)`

## Relationship Navigation

### Parent → Children (Top-Down)
- `journeys` → `phases` (via `phases.journey_id`)
- `phases` → `steps` (via `steps.phase_id`)
- `steps` → `cards` (via `cards.step_id`)
- `steps` → `journeys` (subjourneys via `journeys.parent_step_id`)

### Child → Parent (Bottom-Up)
- `cards` → `steps` (via `cards.step_id`)
- `steps` → `phases` (via `steps.phase_id`)
- `phases` → `journeys` (via `phases.journey_id`)
- `journeys` → `projects` (via `journeys.project_id`)
- `journeys` → `steps` (parent step via `journeys.parent_step_id`)

### Subjourney Relationships
- **Step → Subjourney**: `SELECT * FROM journeys WHERE parent_step_id = ? AND is_subjourney = true`
- **Subjourney → Parent Step**: `SELECT * FROM steps WHERE id = (SELECT parent_step_id FROM journeys WHERE id = ?)`

## Key Design Decisions

### 1. Team ID at Every Level
Every entity includes `team_id` to enable:
- Efficient team-scoped queries without joins
- Row Level Security (RLS) policies
- Direct team filtering

### 2. Subjourney Pattern
- Uses `journeys.parent_step_id` to reference the parent step
- Eliminates circular dependencies
- Enables efficient subjourney queries

### 3. Sequence Ordering
- Consistent `sequence_order` field on phases, steps, and cards
- Enables predictable ordering within parent entities

### 4. Denormalized Fields
- `steps.comment_count` and `steps.last_comment_at` updated via triggers
- Improves query performance for comment counts

### 5. Attribute System Architecture
- **Definitions** (`attributes`): Team/project level attribute definitions
- **Instances** (`step_attributes`): Junction table creating attribute instances on steps
- Supports AttributeComposer: select from definitions, create instances on steps

### 6. Polymorphic Comments
- Single `comments` table handles multiple entity types
- Uses `target_type` + `target_id` pattern
- RLS policies check access via team membership

## Indexes

All foreign keys and commonly queried fields are indexed:
- Team-scoped queries: `idx_*_team_id`
- Parent-child relationships: `idx_*_parent_id`
- Sequence ordering: `idx_*_sequence`
- Polymorphic targets: `idx_comments_target`

## Row Level Security (RLS)

All tables have RLS enabled with team-based access policies:
- Users can only access data from teams they're members of
- Policies check `team_memberships` table for access
- Comments have additional author-based policies for update/delete

## Triggers

### Updated At
All tables have triggers to automatically update `updated_at` timestamp on row updates.

### Comment Count
Triggers on `comments` table automatically update `steps.comment_count` and `steps.last_comment_at` when comments are added or removed.

## Common Query Patterns

### Get Journey with Phases and Steps
```sql
SELECT j.*, 
       json_agg(DISTINCT jsonb_build_object(
         'id', p.id,
         'name', p.name,
         'sequence_order', p.sequence_order
       ) ORDER BY p.sequence_order) as phases
FROM journeys j
LEFT JOIN phases p ON p.journey_id = j.id
WHERE j.id = ?
GROUP BY j.id;
```

### Get Step's Parent Phase and Journey
```sql
SELECT s.*,
       p.name as phase_name,
       j.name as journey_name
FROM steps s
JOIN phases p ON p.id = s.phase_id
JOIN journeys j ON j.id = p.journey_id
WHERE s.id = ?;
```

### Get Subjourneys for a Step
```sql
SELECT * FROM journeys
WHERE parent_step_id = ? AND is_subjourney = true
ORDER BY created_at;
```

### Get Attributes for a Step (with definitions)
```sql
SELECT sa.*, a.name, a.type, a.description
FROM step_attributes sa
JOIN attributes a ON a.id = sa.attribute_definition_id
WHERE sa.step_id = ?
ORDER BY sa.sequence_order;
```

## Migration

The schema is defined in `supabase/migrations/20251120114258_initial_schema.sql`.

To apply migrations:
```bash
supabase db reset  # Resets and applies all migrations
```

To create new migrations:
```bash
supabase migration new migration_name
```

