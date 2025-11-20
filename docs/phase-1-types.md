# Phase 1: TypeScript Type Definitions

## Overview

Phase 1 established the foundation of type safety for the Subjourney application by creating comprehensive TypeScript type definitions based on the database schema.

## Structure

All types are organized in `src/types/` with the following structure:

```
src/types/
├── common.ts      # Base types and utilities
├── domain.ts      # Core business entities
├── cards.ts       # Card system types
├── attributes.ts  # Attribute system types
├── flows.ts       # Flow system types
├── comments.ts    # Comment system types
└── index.ts       # Central export point
```

## Core Types

### Common Types (`common.ts`)

- `EntityId` - UUID string type for all entity IDs
- `Timestamp` - ISO 8601 timestamp string
- `ProcessingStatus` - Enum for processing states
- `BaseEntity` - Base interface with `id`, `created_at`, `updated_at`
- `TeamScopedEntity` - Entities that belong to a team
- `JSONSchema` - JSON Schema type definition
- `JSONB` - Generic JSONB data type

### Domain Entities (`domain.ts`)

**Team Hierarchy:**
- `Team` - Multi-tenant organization unit
- `TeamMembership` - Links users to teams with roles
- `Project` - Grouping of journeys within a team
- `Journey` - Main journey map (can be a subjourney)
- `Phase` - Horizontal grouping within a journey
- `Step` - Individual touchpoint within a phase
- `Card` - Modular card attached to a step

### Card System (`cards.ts`)

- `Module` - Plugin module that provides card types
- `CardType` - Definition of a card type with JSON Schema validation
- `CardIntegration` - External integrations (Jira, GitHub, etc.)
- `TeamModuleSettings` - Team-specific module configuration

### Attribute System (`attributes.ts`)

- `AttributeType` - Enum: `'actor' | 'action' | 'thing' | 'channel' | 'system' | 'place' | 'word'`
- `Attribute` - Definition of an attribute that can be applied to steps
- `StepAttribute` - Junction table linking steps to attributes
- `Persona` - User persona linked to an actor attribute (note: only actor attributes)

### Flow System (`flows.ts`)

- `Flow` - Sequence of steps that demonstrate a specific path
- `FlowStep` - Junction table linking flows to steps with ordering

### Comment System (`comments.ts`)

- `CommentTargetType` - `'journey' | 'phase' | 'step'`
- `CommentReaction` - `'👍' | '❤️' | '😂' | '😮'`
- `Comment` - Comment on a journey, phase, or step
- `CommentDetails` - Extended comment with author info and reactions

## Key Design Decisions

1. **Type Safety First**: All database fields are typed, ensuring compile-time safety
2. **Denormalized Fields**: Journey includes `allPhases`, `allSteps`, `allCards` for UI convenience
3. **Optional Fields**: Properly marked optional fields match database schema
4. **Enum Types**: Used for constrained string values (status, types, reactions)
5. **Junction Tables**: Properly typed many-to-many relationships

## Usage

```typescript
import type { Journey, Phase, Step, Card } from '@/types';

// Type-safe journey data
const journey: Journey = {
  id: 'uuid',
  team_id: 'uuid',
  project_id: 'uuid',
  name: 'Customer Onboarding',
  is_subjourney: false,
  // ... other fields
};

// Type-safe step with all fields
const step: Step = {
  id: 'uuid',
  phase_id: 'uuid',
  name: 'Sign Up',
  sequence_order: 1,
  // ... other fields
};
```

## Benefits

- **Compile-time Safety**: Catch type errors before runtime
- **IDE Support**: Full autocomplete and IntelliSense
- **Self-documenting**: Types serve as documentation
- **Refactoring Safety**: TypeScript ensures consistency across refactors
- **API Contract**: Types define the contract between frontend and backend

## Next Steps

These types are used throughout:
- Phase 2: API layer (request/response types)
- Phase 3: Zustand store (state types)
- Phase 4: React components (prop types)

