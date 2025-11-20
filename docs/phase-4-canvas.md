# Phase 4: Canvas Components with Measurement-Based Sizing

## Overview

Phase 4 implements the core canvas architecture using React Flow with a single JourneyNode type. The key innovation is **measurement-based sizing** - journey nodes measure their actual rendered DOM size rather than calculating from content counts, making the system more reliable and maintainable.

## Architecture

### Core Principle

**Measurement over Calculation**: The outermost container in JourneyNode measures its actual rendered size using ResizeObserver, then reports that size to React Flow. This approach:
- Accounts for all CSS, padding, margins, borders automatically
- Handles dynamic content (text wrapping, variable card sizes)
- Adapts to styling changes without code updates
- Avoids brittle calculation logic

### Component Hierarchy

```
React Flow Canvas
  └── JourneyNode (React Flow node - dynamically sized)
       ├── ResizeObserver → measures actual DOM size
       ├── React Flow Handles (for subjourney connections)
       └── JourneyDnDContainer (@dnd-kit provider)
            └── DnDPhaseGrid
                 └── DraggablePhase (@dnd-kit sortable)
                      └── PhaseComponent
                           └── DraggableStep (@dnd-kit sortable)
                                └── StepComponent
                                     └── Cards (future)
```

## Components

### 1. `useJourneySizeMeasurement` Hook

**Location**: `src/hooks/useJourneySizeMeasurement.ts`

Measures the actual rendered size of the journey node container:

- Uses `ResizeObserver` to automatically track size changes
- Measures via `getBoundingClientRect()` for accurate dimensions
- Calls `updateNodeInternals()` to notify React Flow of size changes
- Debounces rapid changes using `requestAnimationFrame`

```typescript
const { containerRef, size } = useJourneySizeMeasurement(nodeId);
// containerRef: ref to attach to outermost container
// size: { width, height } - measured dimensions
```

### 2. JourneyCanvas

**Location**: `src/components/canvas/JourneyCanvas.tsx`

Main canvas component that:
- Wraps React Flow with `ReactFlowProvider`
- Loads journey data from API
- Converts journey data to React Flow nodes and edges
- Applies Dagre layout for positioning
- Handles subjourney connections

### 3. JourneyNode

**Location**: `src/components/canvas/JourneyNode.tsx`

Single React Flow node type for all journeys (main and subjourneys):

- Uses `useJourneySizeMeasurement` to measure actual size
- Stores measured size in `data-width` and `data-height` attributes
- Renders React Flow handles for connections
- Wraps `JourneyDnDContainer` for content

**Key Features**:
- Dynamic sizing based on actual content
- Selection state integration
- Handles for subjourney connections

### 4. JourneyDnDContainer

**Location**: `src/components/journey/JourneyDnDContainer.tsx`

Outermost container that gets measured:

- Wraps `@dnd-kit/react` DragDropProvider
- Contains journey title and phase grid
- Uses `width: fit-content` and `height: auto` to grow naturally
- This container's size is what gets measured

### 5. DnDPhaseGrid

**Location**: `src/components/journey/DnDPhaseGrid.tsx`

Grid layout for phases:
- Displays phases in a horizontal row
- Sorts phases by `sequence_order`
- Renders `DraggablePhase` components

### 6. DraggablePhase

**Location**: `src/components/journey/DraggablePhase.tsx`

Phase with drag-and-drop support:
- Uses `@dnd-kit/react/sortable`
- Wraps `PhaseComponent`
- Handles phase reordering

### 7. PhaseComponent

**Location**: `src/components/journey/PhaseComponent.tsx`

Renders a phase with its steps:
- Displays phase name and color
- Renders steps sorted by `sequence_order`
- Integrates with store for step data

### 8. DraggableStep

**Location**: `src/components/journey/DraggableStep.tsx`

Step with drag-and-drop support:
- Uses `@dnd-kit/react/sortable`
- Wraps `StepComponent`
- Handles step reordering within/between phases

### 9. StepComponent

**Location**: `src/components/journey/StepComponent.tsx`

Renders a step:
- Displays step name and description
- Shows card count
- Handles selection state
- Integrates with store

## Layout System

### Dagre Integration

**Location**: `src/components/canvas/layout.ts`

- `applyDagreLayout()` - Main layout function for positioning nodes
- `layoutChildrenWithinContainer()` - Nested layout for subjourneys
- Reads measured sizes from DOM `data-width` and `data-height` attributes
- Handles parent-child relationships for subjourneys

### Layout Flow

1. Content renders in JourneyDnDContainer
2. Browser calculates actual layout
3. ResizeObserver detects size change
4. Size measured via `getBoundingClientRect()`
5. Size stored in `data-width`/`data-height` attributes
6. `updateNodeInternals()` called
7. Dagre layout reads measured sizes
8. Layout recalculates positions
9. Canvas updates all node positions

## Size Measurement Flow

```
JourneyDnDContainer (renders content)
  ↓
Browser calculates layout
  ↓
ResizeObserver detects change
  ↓
measureSize() reads getBoundingClientRect()
  ↓
Size state updates
  ↓
updateNodeInternals(nodeId) called
  ↓
React Flow updates node dimensions
  ↓
Dagre layout reads from data-width/data-height
  ↓
Layout recalculates positions
```

## Subjourney Handling

### Connection System

- **Source Handle**: On steps that have subjourneys (bottom of journey node)
- **Target Handle**: On subjourney nodes (top of journey node)
- **Edges**: Connect parent step to subjourney node
- **Layout**: Dagre positions subjourneys relative to parent

### Collapse/Expand

- Subjourney visibility controlled by store's `collapsedSubjourneys` Set
- When collapsed, subjourney node hidden and edge hidden
- Layout recalculates when subjourneys expand/collapse

## Integration Points

### Store Integration

- **Selection**: `useSelection()` for highlighting selected items
- **Data**: `useJourneyData()` for journey/phases/steps/cards
- **UI**: `useUIState()` for collapsed subjourneys, loading states

### API Integration

- **Loading**: `journeysApi.getJourney()` loads journey with full structure
- **Reordering**: `reorderPhases()`, `reorderSteps()`, `reorderCards()` (to be implemented)
- **Creating**: `createPhase()`, `createStep()`, `createCard()` (to be implemented)

## Dependencies

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@dnd-kit/helpers": "^0.1.21",
  "dagre": "^0.8.5",
  "@types/dagre": "^0.7.53",
  "reactflow": "^11.11.4"
}
```

## Benefits

- **Reliable**: Measures actual rendered size, not calculated
- **Automatic**: ResizeObserver handles all size changes
- **Flexible**: Adapts to any CSS/styling changes
- **Simple**: No complex calculation logic
- **Accurate**: Accounts for padding, margins, borders, text wrapping
- **Performance**: Batched updates via requestAnimationFrame

## Current Status

✅ **Completed**:
- Measurement hook with ResizeObserver
- JourneyNode with dynamic sizing
- JourneyDnDContainer structure
- Basic phase/step rendering
- Dagre layout integration
- React Flow canvas setup

🚧 **To Be Implemented**:
- Drag-and-drop reordering handlers
- Card rendering and drag-and-drop
- API integration for reordering
- Subjourney edge rendering
- Selection highlighting
- Context menus
- Keyboard navigation

## Next Steps

Phase 4.5 will add:
- Complete drag-and-drop reordering with API calls
- Card system integration
- Subjourney edge rendering
- Enhanced selection and interactions

