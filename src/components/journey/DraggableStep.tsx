/**
 * Draggable Step Component
 * Step with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useRef } from 'react';
import type { Step, Card } from '../../types';
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
  const { getCardsForStep, isStepNewlyAdded, clearNewlyAddedStep } = useAppStore();
  const cards = getCardsForStep(step.id);
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((c) => c.id);
  const isNewlyAdded = isStepNewlyAdded(step.id);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    data: {
      type: 'step',
      step,
      phaseId,
      index,
    },
  });

  // Clear the "newly added" flag after all animations complete
  useEffect(() => {
    if (isNewlyAdded && containerRef.current) {
      // Wait for the fade-in animation to complete (starts at 0.5s, lasts 0.4s = 0.9s total)
      // Add a small buffer to ensure both animations are done
      const timeoutId = setTimeout(() => {
        clearNewlyAddedStep(step.id);
      }, 950); // 0.95s to ensure both animations complete

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isNewlyAdded, step.id, clearNewlyAddedStep]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        if (containerRef.current !== el) {
          containerRef.current = el;
        }
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={isNewlyAdded ? 'step-newly-added' : ''}
    >
      <StepComponent step={step} hasSubjourney={hasSubjourney} />
      {cardIds.length > 0 && (
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {sortedCards.map((card, cardIndex) => (
              <DraggableCard key={card.id} card={card} stepId={step.id} index={cardIndex} />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

