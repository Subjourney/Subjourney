/**
 * Phase Component
 * Renders a phase with its steps
 */

import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { Phase, Step } from '../../types';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { DraggableStep } from './DraggableStep';
import { PhaseToolbar } from './PhaseToolbar';

interface PhaseComponentProps {
  phase: Phase;
  stepsWithSubjourneys?: Set<string>;
  steps?: Step[]; // Steps for this phase (if provided, use these instead of store)
}

export function PhaseComponent({ phase, stepsWithSubjourneys, steps: providedSteps }: PhaseComponentProps) {
  const { getStepsForPhase } = useAppStore();
  const { select } = useSelection();
  // Use provided steps if available (for subjourneys), otherwise get from store
  const steps = providedSteps || getStepsForPhase(phase.id);

  // Sort steps by sequence_order
  const sortedSteps = [...steps].sort(
    (a, b) => a.sequence_order - b.sequence_order
  );

  const stepIds = sortedSteps.map((s) => s.id);

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedPhase', phase.id);
  };

  return (
    <div
      className="phase"
      data-phase-id={phase.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: '200px',
        gap: 'var(--spacing-sm)',
        position: 'relative',
      }}
    >
      {/* Phase Toolbar - appears when phase is selected */}
      <PhaseToolbar phase={phase} phaseColor={phase.color || 'var(--surface-2)'} />
      <div
        className="phase-header"
        onClick={handleHeaderClick}
        style={{
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-primary-dark)',
          backgroundColor: phase.color || 'var(--surface-2)',
          paddingLeft: '14px',
          paddingRight: '14px',
          paddingTop: '10px',
          paddingBottom: '10px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
        }}
      >
        {phase.name}
      </div>
      <SortableContext items={stepIds} strategy={horizontalListSortingStrategy}>
        <div className="phase-steps" style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-md)' }}>
          {sortedSteps.map((step, index) => (
            <DraggableStep 
              key={step.id} 
              step={step} 
              phaseId={phase.id} 
              index={index}
              hasSubjourney={stepsWithSubjourneys?.has(step.id) || false}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

