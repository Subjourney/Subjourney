/**
 * DnD Phase Grid
 * Grid layout for phases with drag-and-drop support
 */

import type { Phase, Journey, Step } from '../../types';
import { DraggablePhase } from './DraggablePhase';

interface DnDPhaseGridProps {
  phases: Phase[];
  subjourneys?: Journey[];
  steps?: Step[]; // Steps for this journey (from journey.allSteps)
}

export function DnDPhaseGrid({ phases, subjourneys = [], steps = [] }: DnDPhaseGridProps) {
  // Sort phases by sequence_order
  const sortedPhases = [...phases].sort(
    (a, b) => a.sequence_order - b.sequence_order
  );

  const phaseIds = sortedPhases.map((p) => p.id);

  // Create a map of step IDs that have subjourneys
  const stepsWithSubjourneys = new Set(
    subjourneys.map((sj) => sj.parent_step_id).filter((id): id is string => !!id)
  );

  return (
    <div
      className="phase-grid"
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        width: 'fit-content',
      }}
    >
      {sortedPhases.map((phase, index) => {
        // Get steps for this phase from the provided steps array
        const phaseSteps = steps.filter((s) => s.phase_id === phase.id);
        return (
          <DraggablePhase 
            key={phase.id} 
            phase={phase} 
            index={index}
            stepsWithSubjourneys={stepsWithSubjourneys}
            steps={phaseSteps}
          />
        );
      })}
    </div>
  );
}

