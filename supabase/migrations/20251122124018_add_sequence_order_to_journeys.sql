-- Add sequence_order column to journeys table
-- Only top-level journeys (is_subjourney = FALSE) require sequence_order
-- Subjourneys (is_subjourney = TRUE) should have NULL sequence_order
ALTER TABLE journeys ADD COLUMN sequence_order INTEGER;

-- Backfill sequence_order for existing top-level journeys
-- Order them by created_at to maintain current order (1-based indexing)
WITH numbered_journeys AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS seq
    FROM journeys
    WHERE is_subjourney = FALSE
)
UPDATE journeys j
SET sequence_order = n.seq
FROM numbered_journeys n
WHERE j.id = n.id AND j.is_subjourney = FALSE;

-- Add a constraint to ensure subjourneys don't have sequence_order
-- This is added after backfilling to avoid issues with existing NULL values
ALTER TABLE journeys ADD CONSTRAINT journeys_sequence_order_check 
    CHECK (
        (is_subjourney = FALSE AND sequence_order IS NOT NULL) OR
        (is_subjourney = TRUE AND sequence_order IS NULL)
    );

