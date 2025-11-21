# Canvas Data Manipulation with Zustand Actions

## Overview

This document explains how we use Zustand actions for canvas data manipulation with optimistic updates. This pattern ensures instant UI feedback while maintaining data consistency through background persistence and realtime synchronization.

## Core Pattern: Optimistic Updates

The fundamental pattern for all canvas data operations:

1. **Optimistic Update**: Immediately update the store (UI reflects change instantly)
2. **Background Persistence**: Call API to persist change to database
3. **Error Handling**: Revert optimistic update if API call fails
4. **Realtime Sync**: Supabase Realtime broadcasts changes to all clients

## Store Structure

### Data State

```typescript
interface DataState {
  // Entity collections
  attributes: Attribute[];
  stepAttributes: Record<EntityId, Attribute[]>; // stepId -> attributes[]
  
  // ... other collections
}
```

### Optimistic Actions Pattern

All optimistic actions follow this structure:

```typescript
actionNameOptimistic: async (params) => {
  // 1. Get current state
  const current = get().stateKey;
  const prev = current[itemId] || [];
  
  // 2. Optimistic update (instant UI feedback)
  set({ stateKey: { ...current, [itemId]: newValue } });
  
  // 3. Background persistence
  try {
    await apiCall(params);
  } catch (err) {
    // 4. Revert on failure
    set({ stateKey: { ...current, [itemId]: prev } });
    throw err;
  }
}
```

## Attribute System Example

The attribute system demonstrates the complete pattern:

### Adding an Attribute to a Step

```typescript
addStepAttributeOptimistic: async (stepId, attribute) => {
  const sid = String(stepId);
  const map = get().stepAttributes || {};
  const prev = map[sid] || [];
  
  // Optimistic: Add attribute to UI immediately
  set({ 
    stepAttributes: { 
      ...map, 
      [sid]: [...prev, attribute] 
    } 
  });
  
  try {
    // Persist to database
    await attributesApi.addAttributeToStep(sid, String(attribute.id), 'primary');
  } catch (err) {
    // Revert on failure
    set({ stepAttributes: { ...map, [sid]: prev } });
    throw err;
  }
}
```

**Usage in Component:**

```typescript
const handleAddAttribute = (attr: Attribute) => {
  const store = useAppStore.getState();
  store.addStepAttributeOptimistic(stepId, attr).catch(() => {
    // Error already handled (reverted), just log if needed
  });
};
```

### Removing an Attribute from a Step

```typescript
removeStepAttributeOptimistic: async (stepId, index) => {
  const sid = String(stepId);
  const map = get().stepAttributes || {};
  const prev = map[sid] || [];
  const removed = prev[index];
  
  if (!removed) return;
  
  // Optimistic: Remove from UI immediately
  const next = prev.filter((_, i) => i !== index);
  set({ stepAttributes: { ...map, [sid]: next } });
  
  try {
    // Persist deletion
    await attributesApi.removeAttributeFromStep(sid, String(removed.id));
  } catch (err) {
    // Revert on failure
    set({ stepAttributes: { ...map, [sid]: prev } });
    throw err;
  }
}
```

### Changing an Attribute on a Step

```typescript
changeStepAttributeOptimistic: async (stepId, index, attribute) => {
  const sid = String(stepId);
  const map = get().stepAttributes || {};
  const prev = map[sid] || [];
  const prevAttr = prev[index];
  
  // Optimistic: Update in UI immediately
  const next = [...prev];
  next[index] = attribute;
  set({ stepAttributes: { ...map, [sid]: next } });
  
  try {
    // Persist: Remove old, add new
    if (prevAttr) {
      await attributesApi.removeAttributeFromStep(sid, String(prevAttr.id));
    }
    await attributesApi.addAttributeToStep(sid, String(attribute.id), 'primary');
  } catch (err) {
    // Revert on failure
    set({ stepAttributes: { ...map, [sid]: prev } });
    throw err;
  }
}
```

## Realtime Integration

Supabase Realtime ensures all clients stay synchronized:

### Realtime Hook

```typescript
// src/hooks/useRealtimeAttributes.ts
export function useRealtimeAttributes() {
  useEffect(() => {
    // Subscribe to step_attributes changes
    const channel = supabase
      .channel('realtime:step_attributes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'step_attributes' },
        (payload) => {
          // Merge remote changes into store
          // (idempotent - won't duplicate optimistic updates)
        }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, []);
}
```

### How It Works Together

1. **User Action**: User adds attribute → optimistic update
2. **API Call**: Background API call persists to database
3. **Realtime Broadcast**: Supabase broadcasts change to all clients
4. **Merge**: Realtime hook merges change (idempotent - skips if already applied)
5. **All Clients Updated**: Every user sees the change

## Data Loading Pattern

### Initial Load

```typescript
loadStepAttributesForJourney: async (journey) => {
  // Collect all step IDs
  const allStepIds = [...journey.allSteps.map((s) => s.id)];
  
  // Fetch in parallel
  const stepAttributesResults = await Promise.all(
    allStepIds.map(stepId => 
      attributesApi.getStepAttributes(String(stepId))
    )
  );
  
  // Fetch attribute definitions
  const attributeDefIds = new Set<string>();
  stepAttributesResults.forEach(stepAttrs => {
    stepAttrs.forEach(stepAttr => {
      attributeDefIds.add(stepAttr.attribute_definition_id);
    });
  });
  
  const attributes = await Promise.all(
    Array.from(attributeDefIds).map(attrId =>
      attributesApi.getAttribute(attrId)
    )
  );
  
  // Map and store
  const stepAttributesMap: Record<string, Attribute[]> = {};
  // ... mapping logic ...
  
  set({ stepAttributes: stepAttributesMap });
}
```

**Usage:**

```typescript
// In JourneyCanvas when journey loads
useEffect(() => {
  journeysApi.getJourney(journeyId).then(async (journey) => {
    setCurrentJourney(journey);
    await loadStepAttributesForJourney(journey);
  });
}, [journeyId]);
```

## Component Integration

### Reading Data

```typescript
// StepComponent.tsx
export function StepComponent({ step }: StepComponentProps) {
  // Subscribe to step's attributes
  const stepAttributes = useAppStore((s) => 
    s.stepAttributes[String(step.id)] ?? []
  );
  
  return (
    <AttributeComposer
      stepId={step.id}
      attributes={stepAttributes}
      // ...
    />
  );
}
```

### Writing Data

```typescript
// AttributeComposer.tsx
const handleAddMenuSelect = (attr: Attribute) => {
  const store = useAppStore.getState();
  store.addStepAttributeOptimistic(stepId, attr).catch(() => {
    // Error handled (reverted), no-op
  });
};
```

## Benefits

### 1. Instant Feedback
- UI updates immediately when user acts
- No waiting for network round-trip
- Feels responsive and snappy

### 2. Data Consistency
- Automatic revert on API failure
- Realtime sync keeps all clients in sync
- Single source of truth (Zustand store)

### 3. Error Resilience
- Failed API calls don't leave UI in broken state
- User can retry without manual cleanup
- Clear error boundaries

### 4. Collaborative Ready
- Realtime updates work seamlessly
- Optimistic updates don't conflict with remote changes
- Idempotent merge logic prevents duplicates

## Best Practices

### 1. Always Store Previous State

```typescript
// ✅ Good
const prev = map[sid] || [];
set({ ...newState });
try {
  await apiCall();
} catch {
  set({ ...prev }); // Can revert
}

// ❌ Bad
set({ ...newState });
try {
  await apiCall();
} catch {
  // Can't revert - lost previous state
}
```

### 2. Use Stable References

```typescript
// ✅ Good - stable empty array
const EMPTY_ATTRS: Attribute[] = [];
const stepAttributes = useAppStore((s) => 
  s.stepAttributes[String(step.id)] ?? EMPTY_ATTRS
);

// ❌ Bad - new array every render
const stepAttributes = useAppStore((s) => 
  s.stepAttributes[String(step.id)] ?? []
);
```

### 3. Handle Errors Gracefully

```typescript
// ✅ Good - silent error handling
store.addStepAttributeOptimistic(stepId, attr).catch(() => {
  // Already reverted, no user action needed
});

// ❌ Bad - noisy error handling
store.addStepAttributeOptimistic(stepId, attr).catch((err) => {
  alert('Failed!'); // User already sees it's gone
  console.error(err);
});
```

### 4. Idempotent Realtime Merges

```typescript
// ✅ Good - check before adding
const current = store.getAttributesForStep(stepId);
if (!current.find(a => a.id === newAttr.id)) {
  // Add it
}

// ❌ Bad - always add
store.setAttributesForStep(stepId, [...current, newAttr]);
// Could duplicate if optimistic update already applied
```

## Future Patterns

This pattern extends to other canvas operations:

- **Step Reordering**: Optimistic reorder → API call → Realtime sync
- **Card Management**: Optimistic add/remove → API call → Realtime sync
- **Phase Operations**: Optimistic create/update → API call → Realtime sync

All follow the same three-step pattern:
1. Optimistic update
2. Background persistence
3. Error revert

## Summary

Zustand actions with optimistic updates provide:
- **Instant UI feedback** for better UX
- **Automatic error recovery** for reliability
- **Realtime synchronization** for collaboration
- **Single source of truth** for maintainability

This pattern is the foundation for all canvas data manipulation in Subjourney.

