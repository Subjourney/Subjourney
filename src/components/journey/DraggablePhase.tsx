/**
 * Draggable Phase Component
 * Phase with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Phase, Step } from '../../types';
import { PhaseComponent } from './PhaseComponent';

interface DraggablePhaseProps {
  phase: Phase;
  index: number;
  stepsWithSubjourneys?: Set<string>;
  steps?: Step[]; // Steps for this phase (passed from parent)
}

export function DraggablePhase({ phase, index, stepsWithSubjourneys, steps }: DraggablePhaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: phase.id,
    data: {
      type: 'phase',
      phase,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PhaseComponent phase={phase} stepsWithSubjourneys={stepsWithSubjourneys} steps={steps} />
    </div>
  );
}

