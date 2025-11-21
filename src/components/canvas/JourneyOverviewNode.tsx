/**
 * Journey Overview Node Component
 * React Flow node that displays a journey's phases and steps in a compact overview
 * Rendered directly on the project canvas
 */

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Circle, Square } from '@phosphor-icons/react';
import { useJourneySizeMeasurement } from '../../hooks/useJourneySizeMeasurement';
import type { Journey, Phase, Step } from '../../types';
import type { NodeProps } from '@xyflow/react';

interface JourneyOverviewNodeData {
  journey: Journey;
  phases?: Phase[];
  steps?: Step[];
  onJourneyClick?: () => void;
  onPhaseClick?: (phaseId: string) => void;
  onStepClick?: (stepId: string) => void;
}

export function JourneyOverviewNode(props: NodeProps) {
  const { id, data } = props;
  const nodeId = String(id);
  // Skip updateNodeInternals for project canvas - we don't need it since nodes aren't contained
  const { containerRef, size } = useJourneySizeMeasurement(nodeId, true);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  
  const nodeData = (data as unknown as JourneyOverviewNodeData);
  const { journey, phases = [], steps = [], onJourneyClick, onPhaseClick, onStepClick } = nodeData;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJourneyClick) {
      onJourneyClick();
    }
  };

  const handlePhaseClick = (phaseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPhaseClick) {
      onPhaseClick(phaseId);
    }
  };

  const handleStepClick = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStepClick) {
      onStepClick(stepId);
    }
  };

  // Get steps for a phase
  const getStepsForPhase = (phaseId: string): Step[] => {
    return steps.filter(step => step.phase_id === phaseId);
  };

  return (
    <div
      ref={containerRef}
      className="journey-overview-node"
      style={{
        width: 'fit-content',
        height: 'auto',
        minWidth: '300px',
        background: 'var(--surface-2)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'default',
        position: 'relative',
        '--measured-width': `${size.width}px`,
        '--measured-height': `${size.height}px`,
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      data-journey-id={id}
      data-journey-node="true"
      data-width={size.width}
      data-height={size.height}
    >
      {/* Journey Header */}
      <div
        style={{
          background: 'var(--surface-3)',
          padding: 'var(--spacing-sm) 10px 10px 12px',
          borderBottom: 'var(--border-divider)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          height: '40px',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {journey.name}
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            border: 'var(--border-default)',
            background: 'var(--surface-5)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {journey.is_subjourney ? 'Sub' : 'Main'}
        </div>

        {/* Main Node Handles */}
        {/* Header-specific left handle for incoming connections */}
        <Handle
          type="target"
          position={Position.Left}
          id={`journey-${journey.id}-header-left`}
          style={{
            width: '0px',
            height: '0px',
            background: 'transparent',
            left: '2px',
            top: '20px',
          }}
        />
      </div>

      {/* Phases and Steps List */}
      <div style={{ padding: 0 }}>
        {phases.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            No phases yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {phases.map((phase, phaseIndex) => {
              const phaseSteps = getStepsForPhase(phase.id);
              const isLastPhase = phaseIndex === phases.length - 1;

              return (
                <React.Fragment key={phase.id}>
                  {/* Phase Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      height: '40px',
                      padding: '0 10px',
                      borderBottom: isLastPhase && phaseSteps.length === 0 ? 'none' : 'var(--border-divider)',
                      cursor: 'pointer',
                      background:
                        hoveredPhase === phase.id
                          ? `${phase.color || '#3B82F6'}20`
                          : 'transparent',
                      position: 'relative',
                    }}
                    onMouseEnter={() => setHoveredPhase(phase.id)}
                    onMouseLeave={() => setHoveredPhase(null)}
                    onClick={(e) => handlePhaseClick(phase.id, e)}
                  >
                    <Square
                      size={14}
                      weight={hoveredPhase === phase.id ? 'fill' : 'regular'}
                      color={phase.color || '#3B82F6'}
                      style={{
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-regular)',
                        color: hoveredPhase === phase.id ? phase.color || '#3B82F6' : 'var(--color-text-tertiary)',
                        flex: 1,
                      }}
                    >
                      {phase.name}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: `${phase.color || '#3B82F6'}20`,
                        color: phase.color || '#3B82F6',
                      }}
                    >
                      Phase {phase.sequence_order}
                    </span>
                  </div>

                  {/* Steps for this phase */}
                  {phaseSteps.map((step, stepIndex) => {
                    const isLastStepInLastPhase = isLastPhase && stepIndex === phaseSteps.length - 1;
                    return (
                      <div
                        key={step.id}
                        data-step-id={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-sm)',
                          height: '40px',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          borderBottom: isLastStepInLastPhase ? 'none' : 'var(--border-divider)',
                          cursor: 'pointer',
                          background:
                            hoveredStep === step.id
                              ? `${phase.color || '#3B82F6'}20`
                              : 'transparent',
                          position: 'relative',
                        }}
                        onMouseEnter={() => setHoveredStep(step.id)}
                        onMouseLeave={() => setHoveredStep(null)}
                        onClick={(e) => handleStepClick(step.id, e)}
                      >
                        <Circle
                          size={14}
                          weight={hoveredStep === step.id ? 'fill' : 'regular'}
                          color={phase.color || '#3B82F6'}
                          style={{
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-primary)',
                            flex: 1,
                          }}
                        >
                          {step.name}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)',
                          }}
                        >
                          {step.sequence_order}
                        </span>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`step-${step.id}`}
                          style={{
                            width: '0px',
                            height: '0px',
                            background: 'transparent',
                            right: '0px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                        />
                        {/* Target handle on right side to receive connections from subjourney final steps */}
                        <Handle
                          type="target"
                          position={Position.Right}
                          id={`step-${step.id}-target`}
                          style={{
                            width: '0px',
                            height: '0px',
                            background: 'transparent',
                            right: '0px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                        />
                        {/* Left handle for final step in subjourneys to connect back to parent */}
                        {journey.is_subjourney && isLastStepInLastPhase && (
                          <Handle
                            type="source"
                            position={Position.Left}
                            id={`step-${step.id}-left`}
                            style={{
                              width: '0px',
                              height: '0px',
                              background: 'transparent',
                              left: '0px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Top handle for subjourney connections in journey canvas */}
      <Handle
        type="target"
        position={Position.Top}
        id={`journey-${journey.id}-top-subjourney`}
        style={{
          width: '0px',
          height: '0px',
          background: 'transparent',
          top: '0px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Bottom handle for subjourney chaining in journey canvas */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={`journey-${journey.id}-bottom-subjourney`}
        style={{
          width: '0px',
          height: '0px',
          background: 'transparent',
          bottom: '0px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Top handle for main journey sequence connections */}
      {!journey.is_subjourney && (
        <Handle
          type="target"
          position={Position.Top}
          id={`journey-${journey.id}-top`}
          style={{
            width: '0px',
            height: '0px',
            background: 'transparent',
            top: '0px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}

      {/* Bottom handle for main journey sequence connections */}
      {!journey.is_subjourney && (
        <Handle
          type="source"
          position={Position.Bottom}
          id={`journey-${journey.id}-bottom`}
          style={{
            width: '0px',
            height: '0px',
            background: 'transparent',
            bottom: '0px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  );
}

