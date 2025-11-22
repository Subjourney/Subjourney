/**
 * Project Setup Node Component
 * React Flow node that displays setup options for a new project
 * Shows when project has no journeys
 */

import React from 'react';
import { CaretRight, Sparkle, MapTrifold } from '@phosphor-icons/react';
import type { NodeProps } from '@xyflow/react';
import { Button } from '../ui';

interface ProjectSetupNodeData {
  onImportJourney?: () => void;
  onCreateJourney?: () => void;
}

export function ProjectSetupNode(props: NodeProps) {
  const { data } = props;
  const nodeData = (data as unknown as ProjectSetupNodeData);
  const { onImportJourney, onCreateJourney } = nodeData;

  return (
    <div
      className="project-setup-node"
      style={{
        width: '400px',
        background: 'var(--surface-2)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: 'var(--spacing-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <Button
        icon={Sparkle}
        endIcon={CaretRight}
        labelAlign="left"
        variant="secondary"
        size="lg"
        fullWidth
        onClick={onImportJourney}
      >
        Import journey data
      </Button>
      <Button
        icon={MapTrifold}
        endIcon={CaretRight}
        labelAlign="left"
        variant="primary"
        size="lg"
        fullWidth
        onClick={onCreateJourney}
      >
        Create new journey
      </Button>
    </div>
  );
}

