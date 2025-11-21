-- Add continue_step_id to journeys for explicit continuation routing

ALTER TABLE journeys
ADD COLUMN IF NOT EXISTS continue_step_id UUID REFERENCES steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journeys_continue_step_id ON journeys(continue_step_id);

COMMENT ON COLUMN journeys.continue_step_id IS 'Optional explicit continuation step for this journey. When set, the journey continues at this step after its final step.';


