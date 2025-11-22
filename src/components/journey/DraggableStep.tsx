/**
 * Draggable Step Component
 * Step with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/react/sortable';
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
  const { getCardsForStep } = useAppStore();
  const cards = getCardsForStep(step.id);
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((c) => c.id);

  const sortable = useSortable({
    id: step.id,
    data: {
      type: 'step',
      step,
      phaseId,
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
      <StepComponent step={step} hasSubjourney={hasSubjourney} />
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

