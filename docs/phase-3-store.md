# Phase 3: Unified Zustand Store

## Overview

Phase 3 created a unified, type-safe Zustand store that consolidates all application state management into a single, well-organized store.

## Structure

```
src/store/
├── types.ts    # Store type definitions
├── store.ts    # Main Zustand store implementation
├── hooks.ts    # Convenience React hooks
└── index.ts    # Central export point
```

## Store Architecture

The store is organized into three main state categories:

### 1. Selection State

Tracks what the user has selected in the UI:

- `selectedStep` - Currently selected step ID
- `selectedPhase` - Currently selected phase ID
- `selectedJourney` - Currently selected journey ID
- `selectedAttribute` - Currently selected attribute ID
- `selectedFirstAttributeType` - Currently selected first attribute type
- `selectedCard` - Currently selected card ID
- `selectedFlow` - Currently selected flow ID

### 2. UI State

Manages UI preferences and temporary states:

- `editingActive` - Whether editing mode is active
- `collapsedSubjourneys` - Set of collapsed subjourney step IDs
- `loadingSteps` - Set of step IDs currently loading
- `loadingSubjourneys` - Set of subjourney IDs currently loading
- `disableHover` - Disable hover effects
- `isServiceBlueprintOpen` - Service blueprint modal state
- `draggedBlueprintItem` - Currently dragged blueprint item
- `isCenterWhenClicked` - Center canvas on click preference

### 3. Data State

Holds the current data in memory:

- `currentJourney` - Currently loaded journey with full structure
- `phases` - All phases for current context
- `steps` - All steps for current context
- `cards` - All cards for current context
- `attributes` - Available attributes
- `flows` - Available flows

## Key Actions

### Selection Actions

```typescript
// Select an item
select('selectedStep', stepId, { immediate: false, source: 'direct' });

// Clear all selections
clearSelection();

// Deselect specific type
deselect('selectedStep');

// Check if selected
isStepSelected(stepId);
isPhaseSelected(phaseId);
```

### UI Actions

```typescript
// Toggle subjourney collapse
toggleSubjourneyCollapsed(stepId, allJourneys);

// Set subjourney collapsed state
setSubjourneyCollapsed(stepId, true);

// Check collapse state
isSubjourneyCollapsed(stepId);
isSubjourneyVisible(stepId);

// Set editing mode
setEditingActive(true);
```

### Loading Actions

```typescript
// Set loading state
setStepLoading(stepId, true);
setSubjourneyLoading(subjourneyId, true);

// Check loading state
isStepLoading(stepId);
isSubjourneyLoading(subjourneyId);

// Clear all loading
clearAllLoading();
```

### Data Actions

```typescript
// Set current journey (also updates phases, steps, cards)
setCurrentJourney(journey);

// Update individual data arrays
setPhases(phases);
setSteps(steps);
setCards(cards);
setAttributes(attributes);
setFlows(flows);
```

### Data Selectors

```typescript
// Get by ID
getPhaseById(phaseId);
getStepById(stepId);
getCardById(cardId);
getAttributeById(attributeId);
getFlowById(flowId);

// Get related items
getCardsForStep(stepId);
getStepsForPhase(phaseId);
getPhasesForJourney(journeyId);
```

## Convenience Hooks

### `useSelection()`

Provides selection state and actions:

```typescript
const {
  selectedStep,
  selectedPhase,
  selectedJourney,
  select,
  clearSelection,
  deselect,
} = useSelection();
```

### `useJourneyData()`

Provides journey data and setters:

```typescript
const {
  currentJourney,
  phases,
  steps,
  cards,
  setCurrentJourney,
  setPhases,
  setSteps,
  setCards,
} = useJourneyData();
```

### `useUIState()`

Provides UI state and actions:

```typescript
const {
  editingActive,
  collapsedSubjourneys,
  loadingSteps,
  toggleSubjourneyCollapsed,
  setEditingActive,
} = useUIState();
```

### `useIsStepSelected(stepId)`

Hook to check if a step is selected:

```typescript
const isSelected = useIsStepSelected(stepId);
```

### `useDataSelectors()`

Provides all data selector functions:

```typescript
const {
  getPhaseById,
  getStepById,
  getCardsForStep,
  getStepsForPhase,
} = useDataSelectors();
```

## Persistence

The store uses Zustand's `persist` middleware to save user preferences:

**Persisted:**
- Selection state (step, phase, journey, attribute, card, flow)
- UI preferences (editing active, disable hover, center on click)

**Not Persisted:**
- Collapsed subjourneys (reset on page load)
- Loading states (temporary)
- Data arrays (loaded from API)

## Selection Logic

The selection system has smart behavior:

1. **Mutual Exclusivity**: Selecting a step/phase/journey clears others
2. **Attribute Toggle**: Attributes can be toggled independently
3. **Card Selection**: Selecting a card clears step/phase/journey
4. **Flow Persistence**: Flows remain selected when selecting other items
5. **Deferred Updates**: Selection updates are deferred to microtasks to avoid render-phase updates

## Usage Example

```typescript
import { useAppStore } from '@/store';
import { journeysApi } from '@/api';

// In a component
function JourneyViewer({ journeyId }: { journeyId: string }) {
  const { currentJourney, setCurrentJourney } = useJourneyData();
  const { select, selectedStep } = useSelection();
  const { isSubjourneyCollapsed, toggleSubjourneyCollapsed } = useUIState();

  // Load journey
  useEffect(() => {
    journeysApi.getJourney(journeyId).then(setCurrentJourney);
  }, [journeyId]);

  // Handle step click
  const handleStepClick = (stepId: string) => {
    select('selectedStep', stepId);
  };

  // Handle subjourney toggle
  const handleSubjourneyToggle = (stepId: string) => {
    toggleSubjourneyCollapsed(stepId, currentJourney?.subjourneys);
  };

  return (
    // ... component JSX
  );
}
```

## Benefits

- **Single Source of Truth**: All state in one place
- **Type Safety**: Fully typed with TypeScript
- **Performance**: Zustand's selector pattern prevents unnecessary re-renders
- **Developer Experience**: Clear API with helpful hooks
- **Maintainability**: Well-organized and easy to extend
- **Persistence**: User preferences saved automatically

## Improvements Over Original

- **Simplified**: Removed complex debug logging and request ordering
- **Type-Safe**: All actions and state are fully typed
- **Better Organized**: Clear separation of concerns
- **Cleaner API**: Simpler selection logic
- **Convenience Hooks**: Easy-to-use React hooks for common patterns

## Next Steps

The store integrates with:
- Phase 2: API layer (data fetching and updates)
- Phase 4: React components (state consumption and updates)

