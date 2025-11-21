/**
 * Journey Node Component
 * React Flow node that represents a journey (main or subjourney)
 * Uses measurement-based sizing from actual DOM rendering
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useJourneySizeMeasurement } from '../../hooks/useJourneySizeMeasurement';
import { useSelection } from '../../store';
import { JourneyDnDContainer } from '../journey/JourneyDnDContainer';
import type { Journey } from '../../types';
import type { NodeProps } from '@xyflow/react';

interface JourneyNodeData {
  journey: Journey;
}

export function JourneyNode(props: NodeProps) {
  const { id, data, selected } = props;
  const { selectedJourney, select } = useSelection();
  const nodeId = String(id);
  const { containerRef, size } = useJourneySizeMeasurement(nodeId);
  const journey = (data as unknown as JourneyNodeData).journey;
  const isSelected = selected || (selectedJourney !== null && String(selectedJourney) === nodeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedJourney', id);
  };

  return (
    <div
      ref={containerRef}
      className={`journey-node ${isSelected ? 'selected' : ''}`}
      style={{
        // Let content determine size - measurement hook will track it
        width: 'fit-content',
        height: 'auto',

        // No minHeight - let content determine height naturally
        background: 'var(--surface-2)',
        border: 'solid 1px var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: isSelected
          ? 'var(--shadow-selected)'
          : 'var(--shadow-md)',
        padding: '0',
        boxSizing: 'border-box',
        cursor: 'default',
        position: 'relative',
        overflow: 'visible',
        pointerEvents: 'auto',
        // Store measured size for React Flow to read
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
      {/* Target handle at left for parent journey connection (when this is a subjourney) */}
      {journey.is_subjourney && (
        <Handle
          id="parent-left"
          type="target"
          position={Position.Left}
          className="journey-handle-parent"
          style={{
            opacity: 0,
            width: '1px',
            height: '1px',
            left: '-2px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* Source handle at right for next step connection (when this is a subjourney) */}
      {journey.is_subjourney && (
        <Handle
          id="next-step-right"
          type="source"
          position={Position.Right}
          className="journey-handle-next-step"
          style={{
            opacity: 0,
            width: '1px',
            height: '1px',
            right: '-2px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      )}

      {/* Source handle for subjourney connections */}
      {journey.is_subjourney && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          className="journey-handle-top"
          style={{
            opacity: 0,
            width: '1px',
            height: '1px',
            top: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      )}

      {/* Target handle for steps that have subjourneys */}
      {journey.subjourneys && journey.subjourneys.length > 0 && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          className="journey-handle-bottom"
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

      <JourneyDnDContainer journey={journey} />
    </div>
  );
}

