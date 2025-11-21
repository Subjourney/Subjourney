-- Backfill journeys.continue_step_id for existing subjourneys
-- 
-- Rules:
-- 1) If a subjourney already has continue_step_id set, it is left unchanged.
-- 2) For each subjourney with parent_step_id and NULL continue_step_id:
--    - Find the parent journey that owns parent_step_id.
--    - Order all steps in that parent journey by phase.sequence_order, then step.sequence_order.
--    - If there is a next step after parent_step_id in that order, set continue_step_id to that next step.
--    - Otherwise, if the parent journey is itself a subjourney, set continue_step_id back to parent_step_id
--      (looping within the base/parent subjourney).
--    - Otherwise, leave continue_step_id NULL.

WITH ordered_steps AS (
    SELECT
        s.id AS step_id,
        j.id AS journey_id,
        LEAD(s.id) OVER (
            PARTITION BY j.id
            ORDER BY p.sequence_order, s.sequence_order
        ) AS next_step_id
    FROM journeys j
    JOIN phases p ON p.journey_id = j.id
    JOIN steps s ON s.phase_id = p.id
)
UPDATE journeys AS sj
SET continue_step_id = COALESCE(
    os.next_step_id,
    CASE
        WHEN pj.is_subjourney THEN sj.parent_step_id
        ELSE NULL
    END
)
FROM steps ps
JOIN phases pp ON pp.id = ps.phase_id
JOIN journeys pj ON pj.id = pp.journey_id
LEFT JOIN ordered_steps os ON os.step_id = ps.id
WHERE
    sj.is_subjourney = TRUE
    AND sj.parent_step_id IS NOT NULL
    AND sj.continue_step_id IS NULL
    AND ps.id = sj.parent_step_id;


