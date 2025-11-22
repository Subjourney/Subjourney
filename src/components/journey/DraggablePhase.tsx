/**
 * Draggable Phase Component
 * Phase with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/react/sortable';
import type { Phase, Step } from '../../types';
import { PhaseComponent } from './PhaseComponent';

interface DraggablePhaseProps {
  phase: Phase;
  index: number;
  stepsWithSubjourneys?: Set<string>;
  steps?: Step[]; // Steps for this phase (passed from parent)
}

export function DraggablePhase({ phase, index, stepsWithSubjourneys, steps }: DraggablePhaseProps) {
  const sortable = useSortable({
    id: phase.id,
    data: {
      type: 'phase',
      phase,
      index,
    },
  });

  return (
    <div 
      ref={sortable.ref} 
      style={{
        opacity: sortable.isDragging ? 0.5 : 1,
      }}
    >
      <PhaseComponent phase={phase} stepsWithSubjourneys={stepsWithSubjourneys} steps={steps} />
    </div>
  );
}

