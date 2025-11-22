/**
 * Draggable Phase Component
 * Phase with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/react/sortable';
import { PointerSensor } from '@dnd-kit/react';
import { useReactFlow } from '@xyflow/react';
import type { Phase, Step } from '../../types';
import { PhaseComponent } from './PhaseComponent';

interface DraggablePhaseProps {
  phase: Phase;
  index: number;
  stepsWithSubjourneys?: Set<string>;
  steps?: Step[]; // Steps for this phase (passed from parent)
}

export function DraggablePhase({ phase, index, stepsWithSubjourneys, steps }: DraggablePhaseProps) {
  const { getZoom } = useReactFlow();
  const zoom = typeof getZoom === 'function' ? getZoom() : 1;
  const baseDistance = 8;
  const normalizedDistance = Math.max(zoom, 0.01) * baseDistance;

  const sortable = useSortable({
    id: phase.id,
    sensors: [
      PointerSensor.configure({
        activationConstraints: () => ({
          distance: { value: normalizedDistance },
        }),
      }),
    ],
    index,
    data: {
      type: 'phase',
      phase,
      index,
    },
    transition: {
      duration: 200,
      easing: 'ease-out',
      idle: true, // Animate when index changes during drag
    },
  });

  return (
    <div 
      ref={sortable.ref} 
      style={{
        opacity: sortable.isDragging ? 0.5 : 1,
        willChange: sortable.isDragging || sortable.isDropping ? 'transform' : 'auto',
      }}
    >
      <PhaseComponent phase={phase} stepsWithSubjourneys={stepsWithSubjourneys} steps={steps} />
    </div>
  );
}

