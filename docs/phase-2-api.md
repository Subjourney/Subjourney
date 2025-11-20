# Phase 2: Typed API Layer

## Overview

Phase 2 created a fully type-safe API client layer that handles all backend communication with automatic authentication, retry logic, and error handling.

## Structure

```
src/api/
├── client.ts           # Core API client class
├── types.ts            # API-specific types
├── services/
│   ├── journeys.ts     # Journey, Phase, Step operations
│   ├── cards.ts        # Card operations
│   ├── attributes.ts   # Attribute operations
│   ├── flows.ts        # Flow operations
│   ├── comments.ts     # Comment operations
│   └── teams.ts        # Team and Project operations
└── index.ts            # Central export point
```

## Core Components

### API Client (`client.ts`)

The `ApiClient` class provides:

- **Type-safe methods**: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`
- **Automatic authentication**: Integrates with Supabase for token management
- **Retry logic**: Exponential backoff for transient failures
- **Error handling**: Proper error messages and 401 redirects
- **Token refresh**: Automatic token refresh on 401 responses

```typescript
import { apiClient } from '@/api';

// Type-safe GET request
const journey = await apiClient.get<Journey>(`/api/journeys/${id}`);

// Type-safe POST request
const newStep = await apiClient.post<Step>('/api/steps/', {
  phase_id: phaseId,
  name: 'New Step',
});
```

### Service Modules

Each service module provides type-safe methods for a specific domain:

#### Journeys Service (`services/journeys.ts`)

- `getJourney()` - Get journey with full structure
- `createJourney()` - Create new journey
- `updateJourney()` - Update journey
- `deleteJourney()` - Delete journey
- `createPhase()` - Create phase in journey
- `createStep()` - Create step in phase (returns complete journey)
- `createSubjourney()` - Create subjourney for step
- `reorderSteps()` - Reorder steps within phase
- `moveStepToPhase()` - Move step to different phase
- `reorderPhases()` - Reorder phases within journey

#### Cards Service (`services/cards.ts`)

- `getCardsForStep()` - Get all cards for a step
- `createCard()` - Create card on step
- `updateCard()` - Update card
- `deleteCard()` - Delete card
- `reorderCards()` - Reorder cards within step
- `moveCardToStep()` - Move card to different step
- `getModules()` - Get all available modules
- `getCardTypes()` - Get card types for module
- `getCardIntegrations()` - Get integrations for card

#### Attributes Service (`services/attributes.ts`)

- `getAttributes()` - Get attributes for team/project
- `createAttribute()` - Create attribute
- `updateAttribute()` - Update attribute
- `deleteAttribute()` - Delete attribute
- `getStepAttributes()` - Get attributes for step
- `addAttributeToStep()` - Add attribute to step
- `removeAttributeFromStep()` - Remove attribute from step
- `getPersonasForAttribute()` - Get personas for attribute
- `createPersona()` - Create persona

#### Flows Service (`services/flows.ts`)

- `getFlows()` - Get flows for project
- `getFlow()` - Get flow by ID
- `createFlow()` - Create flow
- `updateFlow()` - Update flow
- `deleteFlow()` - Delete flow
- `getFlowSteps()` - Get steps for flow
- `addStepToFlow()` - Add step to flow
- `removeStepFromFlow()` - Remove step from flow
- `reorderFlowSteps()` - Reorder steps in flow

#### Comments Service (`services/comments.ts`)

- `getComments()` - Get comments for target
- `createComment()` - Create comment
- `updateComment()` - Update comment
- `deleteComment()` - Delete comment
- `addCommentReaction()` - Add reaction to comment
- `removeCommentReaction()` - Remove reaction from comment

#### Teams Service (`services/teams.ts`)

- `getTeams()` - Get teams for current user
- `getTeam()` - Get team by ID
- `getTeamBySlug()` - Get team by slug
- `createTeam()` - Create team
- `updateTeam()` - Update team
- `getProjects()` - Get projects for team
- `createProject()` - Create project
- `updateProject()` - Update project
- `deleteProject()` - Delete project

## Configuration

### Environment (`config/environment.ts`)

- `API_BASE_URL` - Base URL for API requests
- `getApiBaseUrl()` - Dynamically determines URL based on environment
- `isLocalDevelopment()` - Checks if running locally

### Supabase Client (`lib/supabase.ts`)

- Configured with auto-refresh tokens
- Session persistence enabled
- URL detection from environment variables

## Authentication

The API client automatically handles authentication:

1. **Token Retrieval**: Gets access token from Supabase session
2. **Header Injection**: Adds `Authorization: Bearer <token>` to all requests
3. **Token Refresh**: Automatically refreshes token on 401 responses
4. **Redirect on Failure**: Redirects to `/login` if authentication fails

## Error Handling

- **Retry Logic**: Automatically retries on 5xx errors with exponential backoff
- **401 Handling**: Attempts token refresh, redirects to login if fails
- **404 Handling**: Returns descriptive error messages
- **Network Errors**: Retries with backoff strategy

## Usage Example

```typescript
import { journeysApi, cardsApi } from '@/api';
import { useAppStore } from '@/store';

// Fetch journey
const journey = await journeysApi.getJourney(journeyId, true);

// Update store
useAppStore.getState().setCurrentJourney(journey);

// Create step
const updatedJourney = await journeysApi.createStep(phaseId, {
  name: 'New Step',
  description: 'Step description',
});

// Create card
const card = await cardsApi.createCard(stepId, {
  card_type_id: cardTypeId,
  data: { title: 'Card Title' },
  position: 0,
});
```

## Benefits

- **Type Safety**: All API calls are type-checked at compile time
- **Consistency**: Unified error handling and authentication
- **Maintainability**: Clear separation of concerns by domain
- **Developer Experience**: Full IDE autocomplete and type hints
- **Reliability**: Automatic retries and error recovery

## Next Steps

The API layer integrates with:
- Phase 3: Zustand store (data fetching and updates)
- Phase 4: React components (API calls in hooks and effects)

