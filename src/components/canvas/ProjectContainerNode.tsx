/**
 * Project Container Node Component
 * React Flow node that represents a project container
 * Contains journey nodes as children
 * Uses measurement-based sizing from actual DOM rendering
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useProjectSizeMeasurement } from '../../hooks/useProjectSizeMeasurement';
import { useSelection } from '../../store';
import type { Project } from '../../types';
import type { NodeProps } from '@xyflow/react';

interface ProjectContainerNodeData {
  project: Project;
  onProjectClick?: () => void;
  onCreateJourney?: () => void;
}

export function ProjectContainerNode(props: NodeProps) {
  const { id, data, selected } = props;
  const { selectedProject, select } = useSelection();
  const nodeId = String(id);
  const { containerRef, size } = useProjectSizeMeasurement(nodeId);
  const project = (data as unknown as ProjectContainerNodeData).project;
  const { onProjectClick, onCreateJourney } = (data as unknown as ProjectContainerNodeData);
  const isSelected = selected || (selectedProject !== null && String(selectedProject) === nodeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select('selectedProject', id);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onProjectClick) {
      onProjectClick();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`project-container-node ${isSelected ? 'selected' : ''}`}
      style={{
        // Let content determine size - measurement hook will track it
        width: 'fit-content',
        height: 'auto',
        minWidth: '400px',
        minHeight: '300px',
        background: 'var(--surface-1)',
        border: isSelected ? 'var(--border-selected)' : 'var(--border-default)',
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
      data-project-id={id}
      data-project-node="true"
      data-width={size.width}
      data-height={size.height}
    >
      {/* Project Name Label - Positioned outside the container */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          left: 0,
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
          background: 'var(--surface-2)',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderRadius: 'var(--radius-md)',
          border: 'var(--border-default)',
          whiteSpace: 'nowrap',
          cursor: onProjectClick ? 'pointer' : 'default',
        }}
        onClick={handleTitleClick}
        title="Click to view project details"
      >
        {project.name}
      </div>

      {/* Container - This is the parent container for ReactFlow child nodes */}
      <div
        style={{
          width: '100%',
          height: '100%',
          minWidth: '400px',
          minHeight: '300px',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'visible',
          padding: 'var(--spacing-md)',
        }}
      >
        {/* ReactFlow will position child nodes (journeys) relative to this container's origin */}
        {/* Source handle for connections */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: '12px',
            height: '12px',
            background: 'var(--color-primary)',
            border: 'var(--border-handle)',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    </div>
  );
}

