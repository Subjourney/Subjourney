# Continue Step ID: Subjourney Continuation Logic

## Overview

`continue_step_id` is a critical field in the Subjourney system that determines where a persona's journey continues after completing a subjourney. It enables explicit control over the flow path when a nested journey (subjourney) finishes, ensuring that persona simulations follow the correct sequence through complex, multi-level journey structures.

## What is `continue_step_id`?

`continue_step_id` is an optional UUID field on the `journeys` table that references a `step.id`. It is **only used for subjourneys** (`is_subjourney = true`) and specifies which step in the parent journey should be executed after the subjourney's final step completes.

### Database Schema

```sql
ALTER TABLE journeys
ADD COLUMN continue_step_id UUID REFERENCES steps(id) ON DELETE SET NULL;

COMMENT ON COLUMN journeys.continue_step_id IS 
  'Optional explicit continuation step for this journey. 
   When set, the journey continues at this step after its final step.';
```

## Why It's Important

### 1. **Explicit Flow Control**

Without `continue_step_id`, the system would need to infer the next step, which can be ambiguous or incorrect when:
- Steps are reordered after subjourney creation
- Multiple steps exist at the same level
- Complex nested subjourney structures exist

### 2. **Persona Simulation Accuracy**

For persona simulations, `continue_step_id` ensures that:
- **Path correctness**: Personas follow the intended flow through nested journeys
- **Predictability**: The continuation point is explicit and stored, not computed on-the-fly
- **Consistency**: All simulations use the same continuation logic

### 3. **Visual Representation**

On the project canvas, `continue_step_id` determines where the dashed connector arrow points from a subjourney's final step, providing visual clarity about the flow path.

## Computation Logic

The system automatically computes `continue_step_id` when a subjourney is created, following these rules:

### Algorithm: `_compute_continue_step_id_for_subjourney`

```python
def _compute_continue_step_id_for_subjourney(
    subjourney: Dict[str, Any],
    parent_journey: Dict[str, Any],
    parent_phases: List[Dict[str, Any]],
    parent_steps: List[Dict[str, Any]],
) -> Optional[str]:
```

#### Step 1: Build Ordered Step List

1. Sort all phases in the parent journey by `sequence_order`
2. For each phase, sort steps by `sequence_order`
3. Create a flat, ordered list of all steps: `[step1, step2, step3, ...]`

#### Step 2: Find Parent Step Index

Locate the `parent_step_id` (the step that contains this subjourney) in the ordered list.

#### Step 3: Determine Continuation

**Case 1: Next Step Exists**
- If the parent step is not the last step in the parent journey
- → Continue to the **next sequential step** after the parent step

**Case 2: Last Step + Nested Subjourney**
- If the parent step is the last step AND the parent journey is itself a subjourney
- → Loop back to the **parent step itself** (return to the same step within the parent subjourney)

**Case 3: Last Step + Top-Level Journey**
- If the parent step is the last step AND the parent journey is top-level
- → Return `None` (no continuation - journey ends)

### Example Scenarios

#### Scenario 1: Standard Continuation

```
Parent Journey:
  Phase 1:
    Step A (parent_step_id) → Subjourney X
    Step B (continue_step_id) ← Subjourney X continues here
    Step C
```

When Subjourney X completes, the persona continues to Step B.

#### Scenario 2: Nested Subjourney Loop

```
Top-Level Journey:
  Phase 1:
    Step 1 → Subjourney A
      Phase 1:
        Step A1 → Subjourney B (nested)
        Step A2 (continue_step_id = Step A1) ← Subjourney B loops back
```

When Subjourney B completes, it loops back to Step A1 within Subjourney A.

#### Scenario 3: End of Journey

```
Top-Level Journey:
  Phase 1:
    Step 1 → Subjourney X
    Step 2 (last step)
```

When Subjourney X completes, `continue_step_id` is `None` - the journey ends.

## Implications for Persona Simulation Paths

### Path Execution Flow

When simulating a persona's journey:

1. **Enter Subjourney**: Persona reaches a step with a subjourney
2. **Execute Subjourney**: Persona completes all steps in the subjourney
3. **Check `continue_step_id`**: System looks up the subjourney's `continue_step_id`
4. **Continue Path**: Persona proceeds to the step specified by `continue_step_id`
5. **Resume Parent Journey**: Persona continues from that point in the parent journey

### Critical Properties

#### 1. **Deterministic Paths**

`continue_step_id` ensures that persona simulations are **deterministic**:
- Same subjourney → Same continuation point
- No ambiguity about where to go next
- Reproducible simulation results

#### 2. **Explicit Override Capability**

While the system computes `continue_step_id` automatically, it can be **manually overridden**:
- Set a specific `continue_step_id` to create custom flow paths
- Useful for complex branching scenarios
- Allows non-sequential continuations

#### 3. **Nested Journey Support**

For deeply nested subjourneys:
- Each subjourney has its own `continue_step_id`
- Continuation is resolved at each level
- Supports arbitrary nesting depth

### Example: Complex Nested Path

```
Journey: "Customer Onboarding"
  Step 1: "Collect Information"
    Subjourney: "Provider Search & Matching"
      Step A: "Search Providers"
        Subjourney: "Provider Details" (nested)
          Step A1: "View Details"
          Step A2: "Compare Options"
          → continue_step_id: Step A (loops back)
      Step B: "Select Provider"
      → continue_step_id: Step 2 (next in parent)
  Step 2: "Confirm Appointment"
  Step 3: "Send Confirmation"
```

**Persona Path:**
1. Start at Step 1
2. Enter "Provider Search & Matching"
3. Execute Step A
4. Enter "Provider Details" (nested)
5. Execute Steps A1, A2
6. Continue to Step A (loop back)
7. Execute Step B
8. Continue to Step 2 (parent journey)
9. Execute Steps 2, 3

## Validation Function Implementation

### Purpose

The validation system ensures that `continue_step_id` values remain correct even when:
- Steps are reordered
- Steps are moved between phases
- Steps are deleted
- Phases are reordered

### Function: `_validate_and_fix_continue_step_id`

```python
def _validate_and_fix_continue_step_id(
    supabase, 
    subjourney: Dict[str, Any], 
    parent_journey: Dict[str, Any], 
    parent_phases: List[Dict[str, Any]], 
    parent_steps: List[Dict[str, Any]]
) -> bool:
    """
    Validate and fix continue_step_id for a subjourney.
    Returns True if the value was corrected, False if it was already correct.
    """
```

#### Validation Steps

1. **Recompute Expected Value**
   - Call `_compute_continue_step_id_for_subjourney` with current step ordering
   - Get the "correct" `continue_step_id` based on current state

2. **Compare with Stored Value**
   - Normalize both values to strings
   - Compare `computed_continue_step_id` vs `stored_continue_step_id`

3. **Check Step Existence**
   - If stored value exists, verify the step still exists in parent journey
   - If step was deleted, flag as invalid

4. **Update if Incorrect**
   - If values differ OR step doesn't exist
   - Update database with computed value
   - Return `True` (was fixed)

5. **Return Status**
   - `True`: Value was corrected
   - `False`: Value was already correct

### Automatic Validation Triggers

Validation runs automatically in these scenarios:

#### 1. **Journey Load** (`get_journey_structure`)
- When loading a journey with subjourneys
- Validates all subjourneys before returning data
- Ensures API responses always have correct values

#### 2. **Step Reordering** (`reorder_steps`)
- After steps are reordered within a phase
- Updates `continue_step_id` for affected subjourneys

#### 3. **Step Movement** (`move_step_to_phase`)
- After a step is moved to a different phase
- Updates both source and target journey subjourneys

#### 4. **Step Deletion** (`delete_step`)
- After a step is deleted
- Recomputes `continue_step_id` if it pointed to deleted step
- Updates affected subjourneys

#### 5. **Phase Reordering** (`reorder_phases`)
- After phases are reordered
- Updates all subjourneys in the journey

### Manual Validation Endpoint

For bulk validation and correction:

```http
POST /api/journeys/validate-continue-step-ids/{project_id}
```

**Purpose:**
- Validate all subjourneys in a project
- Fix any incorrect `continue_step_id` values
- Useful for data migration or cleanup

**Response:**
```json
{
  "message": "Validation complete. Fixed 3 out of 15 subjourneys.",
  "fixed_count": 3,
  "total_subjourneys": 15
}
```

## Best Practices

### 1. **Trust Automatic Computation**

- Let the system compute `continue_step_id` automatically
- Only override manually for special cases
- Manual overrides should be documented

### 2. **Validate After Structural Changes**

- Always validate after reordering steps/phases
- Use the manual endpoint for bulk validation
- Monitor for validation errors in logs

### 3. **Handle Edge Cases**

- **Deleted Steps**: Validation automatically fixes references to deleted steps
- **Empty Journeys**: `continue_step_id` is `None` if no valid continuation
- **Circular References**: System prevents infinite loops by validating step existence

### 4. **Testing Persona Paths**

When testing persona simulations:
1. Verify `continue_step_id` is set correctly
2. Test path execution through nested subjourneys
3. Validate continuation points match expected flow
4. Check for orphaned references (deleted steps)

## Implementation Details

### Database Constraints

- `continue_step_id` is nullable (optional)
- Foreign key to `steps(id)` with `ON DELETE SET NULL`
- Indexed for performance: `idx_journeys_continue_step_id`

### Performance Considerations

- Validation runs synchronously but is fast (in-memory computation)
- Bulk validation endpoint processes all subjourneys in a project
- No impact on read performance (single field lookup)

### Error Handling

- Missing parent step: Returns `None`
- Invalid step reference: Validation fixes automatically
- Deleted step reference: Set to `NULL` on cascade

## Migration and Backfill

### Initial Migration

The system includes a SQL migration (`20251121121000_backfill_continue_step_ids.sql`) that:
- Backfills `continue_step_id` for existing subjourneys
- Uses the same computation logic as runtime
- Handles nested subjourney scenarios

### Future Migrations

When adding new subjourney features:
1. Ensure `continue_step_id` is computed on creation
2. Add validation to affected endpoints
3. Update migration scripts if needed

## Summary

`continue_step_id` is a critical component of the Subjourney system that:

- **Enables explicit flow control** for nested journeys
- **Ensures persona simulation accuracy** with deterministic paths
- **Automatically validates and corrects** when journey structure changes
- **Supports complex nested structures** with arbitrary depth
- **Provides visual clarity** on the project canvas

The validation system ensures data integrity while the computation logic provides sensible defaults, making subjourney continuation both powerful and maintainable.

