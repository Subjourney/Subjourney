/**
 * Step Component
 * Renders a step with its cards and attributes
 */

import { Handle, Position } from '@xyflow/react';
import { useState, useCallback } from 'react';
import type { Step, Attribute } from '../../types';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { AttributeComposer } from '../attributes';
import { useParams } from 'react-router-dom';
import { StepToolbar } from './StepToolbar';

interface StepComponentProps {
  step: Step;
  hasSubjourney?: boolean;
}

export function StepComponent({ step, hasSubjourney = false }: StepComponentProps) {
  const { getCardsForStep, attributes, getAttributeById, getPhaseById } = useAppStore();
  const { selectedStep, selectedAttribute, select } = useSelection();
  const cards = getCardsForStep(step.id);
  const isSelected = selectedStep === step.id;
  const stepAttributesFromStore = useAppStore((s) => s.stepAttributes[String(step.id)]);
  // Stable fallback outside the store subscription result to avoid triggering updates
  const stepAttributes = stepAttributesFromStore ?? [];
  const [focusedPillIndex, setFocusedPillIndex] = useState<number | null>(null);
  const { projectId } = useParams<{ teamSlug: string; projectId: string }>();

  // Get parent phase for color
  const parentPhase = getPhaseById(step.phase_id);
  const phaseColor = parentPhase?.color || '#3B82F6';

  // Attribute instances are provided by store (optimistic + realtime, loaded at canvas level)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedStep', step.id);
  };

  const handleAttributeSelect = useCallback(
    (attr: Attribute | null) => {
      select('selectedAttribute', attr?.id || null);
    },
    [select]
  );

  const handleStepSelect = useCallback(
    (stepId: string) => {
      select('selectedStep', stepId);
    },
    [select]
  );

  const handleAttributeCreated = useCallback(
    async (attr: Attribute) => {
      // Add the new attribute to the store
      useAppStore.getState().setAttributes([...attributes, attr]);
    },
    [attributes]
  );

  // Get team ID from step (steps have team_id)
  const teamId = step.team_id ? String(step.team_id) : undefined;

  return (
    <div
      className="step"
      onClick={handleClick}
      data-step-id={step.id}
      style={{
        padding: 'var(--spacing-md)',
        backgroundColor: 'var(--surface-3)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        minHeight: '120px',
        color: 'var(--color-text-primary)',
        position: 'relative',
        width: '280px',
        boxShadow: isSelected ? `0 0 0 2px ${phaseColor}` : 'none',
      }}
    >
      {/* Step Toolbar - appears when step is selected */}
      <StepToolbar step={step} phaseColor={phaseColor} />
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

      <div
        style={{
          fontWeight: 'var(--font-weight-medium)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--color-text-primary)',
        }}
      >
        {step.name}
      </div>
      {step.description && (
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {step.description}
        </div>
      )}
      {cards.length > 0 && (
        <div
          style={{
            marginTop: 'var(--spacing-sm)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {cards.length} card{cards.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Attribute Composer - always visible */}
      <AttributeComposer
        stepId={step.id}
        attributes={stepAttributes}
        selectedAttribute={
          selectedAttribute && isSelected
            ? (getAttributeById(selectedAttribute) || stepAttributes.find((a) => a.id === selectedAttribute)) || null
            : null
        }
        onAttributeSelect={handleAttributeSelect}
        allAttributes={attributes}
        onStepSelect={handleStepSelect}
        teamId={teamId}
        projectId={projectId}
        onAttributeCreated={handleAttributeCreated}
        focusedPillIndex={isSelected ? focusedPillIndex : null}
        onPillFocus={setFocusedPillIndex}
        onPillBlur={() => setFocusedPillIndex(null)}
      />
    </div>
  );
}

