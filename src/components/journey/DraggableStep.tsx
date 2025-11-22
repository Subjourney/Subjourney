/**
 * Draggable Step Component
 * Step with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/react/sortable';
import { PointerSensor } from '@dnd-kit/react';
import { useReactFlow } from '@xyflow/react';
import { pointerIntersection } from '@dnd-kit/collision';
import type { Step } from '../../types';
import { StepComponent } from './StepComponent';
import { useAppStore } from '../../store';
import { DraggableCard } from './DraggableCard';

interface DraggableStepProps {
  step: Step;
  phaseId: string;
  index: number;
  hasSubjourney?: boolean;
}

export function DraggableStep({ step, phaseId, index, hasSubjourney = false }: DraggableStepProps) {
  const { getZoom } = useReactFlow();
  const zoom = typeof getZoom === 'function' ? getZoom() : 1;
  const baseDistance = 8; // in screen px
  const normalizedDistance = Math.max(zoom, 0.01) * baseDistance;
  // Expand droppable hitbox by a constant on-screen amount (px), normalized by zoom (divide)
  const scale = Math.max(zoom, 0.01);
  const hitboxExtendYScreenPx = 160;
  const hitboxExtendXScreenPx = 24;
  const hitboxExtendYCssPx = Math.round(hitboxExtendYScreenPx / scale);
  const hitboxExtendXCssPx = Math.round(hitboxExtendXScreenPx / scale);

  const { getCardsForStep } = useAppStore();
  const cards = getCardsForStep(step.id);
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((c) => c.id);

  const sortable = useSortable({
    id: step.id,
    type: 'step',
    group: 'steps',
    sensors: [
      PointerSensor.configure({
        activationConstraints: () => ({
          distance: { value: normalizedDistance },
        }),
      }),
    ],
    collisionDetector: pointerIntersection,
    alignment: {
      x: 'center',
      y: 'center',
    },
    index,
    data: {
      type: 'step',
      step,
      phaseId,
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
        position: 'relative',
      }}
    >
      <div
        ref={sortable.targetRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: `-${hitboxExtendYCssPx}px`,
          bottom: `-${hitboxExtendYCssPx}px`,
          left: `-${hitboxExtendXCssPx}px`,
          right: `-${hitboxExtendXCssPx}px`,
          pointerEvents: 'none',
        }}
      />
      <StepComponent 
        step={step} 
        hasSubjourney={hasSubjourney}
        zustandIndex={index}
        dbSeq={step.sequence_order}
      />
      {cardIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
          {sortedCards.map((card, cardIndex) => (
            <DraggableCard key={card.id} card={card} stepId={step.id} index={cardIndex} />
          ))}
        </div>
      )}
    </div>
  );
}

