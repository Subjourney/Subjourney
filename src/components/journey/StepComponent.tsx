/**
 * Step Component
 * Renders a step with its cards
 */

import { Handle, Position } from '@xyflow/react';
import type { Step } from '../../types';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';

interface StepComponentProps {
  step: Step;
  hasSubjourney?: boolean;
}

export function StepComponent({ step, hasSubjourney = false }: StepComponentProps) {
  const { getCardsForStep } = useAppStore();
  const { selectedStep, select } = useSelection();
  const cards = getCardsForStep(step.id);
  const isSelected = selectedStep === step.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedStep', step.id);
  };

  return (
    <div
      className="step"
      onClick={handleClick}
      style={{
        padding: 'var(--spacing-md)',
        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--surface-3)',
        border: isSelected
          ? 'var(--border-selected)'
          : 'var(--border-default)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        minHeight: '120px',
        color: 'var(--color-text-primary)',
        position: 'relative',
        width: '280px',
      }}
    >
      {/* Handle for connecting to subjourney */}
      {hasSubjourney && (
        <Handle
          type="source"
          position={Position.Bottom}
          id={`step-${step.id}`}
          style={{
            opacity: 0,
            width: '1px',
            height: '1px',
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}
      
      <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)' }}>
        {step.name}
      </div>
      {step.description && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {step.description}
        </div>
      )}
      {cards.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
          {cards.length} card{cards.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

