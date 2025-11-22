/**
 * Draggable Card Component
 * Card with drag-and-drop reordering support
 */

import { useSortable } from '@dnd-kit/react/sortable';
import { PointerSensor } from '@dnd-kit/react';
import { useReactFlow } from '@xyflow/react';
import type { Card } from '../../types';
import { useSelection } from '../../store';

interface DraggableCardProps {
  card: Card;
  stepId: string;
  index: number;
}

export function DraggableCard({ card, stepId, index }: DraggableCardProps) {
  const { selectedCard, select } = useSelection();
  const { getZoom } = useReactFlow();
  const zoom = typeof getZoom === 'function' ? getZoom() : 1;
  const baseDistance = 6; // slightly lower for small cards
  const normalizedDistance = Math.max(zoom, 0.01) * baseDistance;

  const sortable = useSortable({
    id: card.id,
    sensors: [
      PointerSensor.configure({
        activationConstraints: () => ({
          distance: { value: normalizedDistance },
        }),
      }),
    ],
    index,
    data: {
      type: 'card',
      card,
      stepId,
      index,
    },
    transition: {
      duration: 200,
      easing: 'ease-out',
      idle: true, // Animate when index changes during drag
    },
  });

  const isSelected = selectedCard === card.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedCard', card.id);
  };

  // Get card title from module_data
  const cardTitle = (card.module_data as { title?: string })?.title || 'Untitled Card';
  const cardType = card.card_type || 'unknown';

  return (
    <div
      ref={sortable.ref}
      style={{
        opacity: sortable.isDragging ? 0.5 : 1,
        willChange: sortable.isDragging || sortable.isDropping ? 'transform' : 'auto',
        padding: 'var(--spacing-sm)',
        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--surface-3)',
        border: isSelected
          ? 'var(--border-selected)'
          : 'var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab',
        color: 'var(--color-text-primary)',
      }}
      onClick={handleClick}
    >
      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
        {cardTitle}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
        {cardType}
      </div>
    </div>
  );
}

