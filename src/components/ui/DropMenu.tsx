/**
 * DropMenu Component
 * Dropdown menu using react-popper for positioning
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import { MenuListItem } from './MenuListItem';

export interface DropMenuProps {
  /** Reference to the anchor element that triggers the menu */
  anchorRef: React.RefObject<HTMLElement>;
  /** Whether the menu is open */
  open: boolean;
  /** Callback when menu should close */
  onClose: () => void;
  /** Menu items */
  children: React.ReactNode;
  /** Placement of the menu relative to anchor */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top';
  /** Offset from anchor */
  offset?: [number, number];
}

export function DropMenu({
  anchorRef,
  open,
  onClose,
  children,
  placement = 'bottom-start',
  offset = [0, 8],
}: DropMenuProps) {
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);

  const popperModifiers = useMemo(
    () => [
      { name: 'offset', options: { offset } },
      { name: 'preventOverflow', options: { padding: 8 } },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
          padding: 8,
        },
      },
      {
        name: 'computeStyles',
        options: {
          gpuAcceleration: false,
          adaptive: true,
        },
      },
    ],
    [offset]
  );

  const { styles, attributes } = usePopper(anchorRef.current, popperElement, {
    placement,
    strategy: 'fixed',
    modifiers: popperModifiers,
  });

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popperElement &&
        !popperElement.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, popperElement, anchorRef, onClose]);

  if (!open) return null;

  const menuStyle: React.CSSProperties = {
    ...styles.popper,
    zIndex: 1000,
    minWidth: '160px',
    backgroundColor: 'var(--surface-2)',
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-xs)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  };

  return createPortal(
    <div
      ref={setPopperElement}
      style={menuStyle}
      {...attributes.popper}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>,
    document.body
  );
}

