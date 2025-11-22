/**
 * DropMenu Component
 * Dropdown menu using react-popper for positioning
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';

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
  offset = [0, 16],
}: DropMenuProps) {
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

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

  const { styles, attributes } = usePopper(
    open && mounted ? anchorRef.current : null,
    popperElement,
    {
    placement,
    strategy: 'fixed',
    modifiers: popperModifiers,
    }
  );

  // Handle mounting/unmounting to prevent cleanup race conditions
  useEffect(() => {
    if (open) {
      // Mount on next frame to ensure DOM is ready
      const rafId = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      // Unmount after a brief delay to allow React to clean up
      const timeoutId = setTimeout(() => {
        setMounted(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Close menu on outside click
  useEffect(() => {
    if (!open || !mounted) return;

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
  }, [open, mounted, popperElement, anchorRef, onClose]);

  if (!mounted) return null;

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
    display: open ? 'flex' : 'none',
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

