/**
 * Portal Node Component
 * React Flow node that represents a subjourney portal
 * Displays only the subjourney name and navigates to it when clicked
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Journey } from '../../types';

interface PortalNodeData {
  journey: Journey;
}

export function PortalNode(props: NodeProps) {
  const { id, data, selected } = props;
  const navigate = useNavigate();
  const { teamSlug, projectId } = useParams<{
    teamSlug: string;
    projectId: string;
  }>();
  const journey = (data as unknown as PortalNodeData).journey;
  const nodeId = String(id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (teamSlug && projectId) {
      // Use journey.id directly (not nodeId) since nodeId might be prefixed with "parent-"
      navigate(`/${teamSlug}/project/${projectId}/journey/${journey.id}`);
    }
  };

  return (
    <div
      className={`portal-node ${selected ? 'selected' : ''}`}
      style={{
        width: '200px',
        minHeight: '60px',
        background: 'var(--surface-2)',
        border: selected
          ? 'var(--border-selected)'
          : 'var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: selected
          ? 'var(--shadow-selected)'
          : 'var(--shadow-md)',
        padding: 'var(--spacing-md)',
        boxSizing: 'border-box',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      data-journey-id={id}
      data-portal-node="true"
    >
      {/* Target handle for connections from parent step */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="portal-handle-top"
        style={{
          opacity: 0,
          width: '1px',
          height: '1px',
          top: '-2px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Source handle for connections to subjourneys or parent journey connections */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="portal-handle-bottom"
        style={{
          opacity: 0,
          width: '1px',
          height: '1px',
          bottom: '-2px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      <div
        style={{
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-base)',
          fontWeight: 500,
          wordBreak: 'break-word',
        }}
      >
        {journey.name}
      </div>
    </div>
  );
}

