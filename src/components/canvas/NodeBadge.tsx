/**
 * Node Badge Component
 * Reusable badge component for journey nodes that appears above the node
 */

import React, { useState } from 'react';

interface NodeBadgeProps {
  /** The label text to display in the badge */
  label: string;
  /** Whether the node is selected */
  isSelected: boolean;
  /** Callback when badge is clicked */
  onSelect: () => void;
}

export function NodeBadge({ label, isSelected, onSelect }: NodeBadgeProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: '-38px',
        left: '0px',
        backgroundColor: (hovered || isSelected) ? 'var(--surface-3)' : 'var(--surface-2)',
        color: (hovered || isSelected) ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        whiteSpace: 'nowrap',
        zIndex: 10,
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </div>
  );
}


