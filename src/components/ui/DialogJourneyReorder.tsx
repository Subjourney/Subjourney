/**
 * DialogJourneyReorder Component
 * Dialog for reordering top-level journeys in a project
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { X, DotsNine } from '@phosphor-icons/react';
import { Button } from './Button';
import Sortable from 'sortablejs';
import type { Journey } from '../../types';
import { useAppStore } from '../../store';

export interface DialogJourneyReorderProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when journeys are reordered */
  onReorder: (journeyIds: string[]) => Promise<void>;
  /** Top-level journeys to reorder */
  journeys: Journey[];
}

interface JourneyItemProps {
  journey: Journey;
  index: number;
}

function JourneyItem({ journey, index }: JourneyItemProps) {
  return (
    <div
      className="journey-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        borderWidth: 'var(--border-width-sm)',
        borderStyle: 'var(--border-style)',
        borderColor: 'var(--color-border)',
        cursor: 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 200ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <DotsNine size={20} weight="bold" />
      </div>
      <div style={{ flex: 1, color: 'var(--color-text-primary)' }}>
        {journey.name}
      </div>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {index + 1}
      </div>
    </div>
  );
}

export function DialogJourneyReorder({
  open,
  onClose,
  onReorder,
  journeys,
}: DialogJourneyReorderProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sortableInstanceRef = useRef<Sortable | null>(null);
  const reorderedJourneys = useAppStore((state) => state.journeyReorderReorderedJourneys);
  const hasChanges = useAppStore((state) => state.journeyReorderHasChanges);
  const setJourneyReorderReorderedJourneys = useAppStore((state) => state.setJourneyReorderReorderedJourneys);
  const setJourneyReorderHasChanges = useAppStore((state) => state.setJourneyReorderHasChanges);
  const updateJourneyReorderOrder = useAppStore((state) => state.updateJourneyReorderOrder);
  const resetJourneyReorder = useAppStore((state) => state.resetJourneyReorder);

  // Filter to only top-level journeys (not subjourneys) and sort by sequence_order (memoized)
  const topLevelJourneys = useMemo(() => {
    return journeys
      .filter((j) => !j.is_subjourney)
      .slice()
      .sort((a, b) => {
        const orderA = a.sequence_order ?? 0;
        const orderB = b.sequence_order ?? 0;
        return orderA - orderB;
      });
  }, [journeys]);

  // Initialize journeys order when dialog opens
  useEffect(() => {
    if (!open) return;
    // Do not reinitialize while the user has unsaved changes (prevents reset after drag)
    if (hasChanges) return;
    if (topLevelJourneys.length === 0) {
      resetJourneyReorder();
      return;
    }
    // Initialize only if the current store order differs from the computed order
    const currentIds = (reorderedJourneys || []).map((j) => j.id);
    const nextIds = topLevelJourneys.map((j) => j.id);
    const differs =
      currentIds.length !== nextIds.length ||
      currentIds.some((id, i) => id !== nextIds[i]);
    if (differs) {
      setJourneyReorderReorderedJourneys(topLevelJourneys);
      setJourneyReorderHasChanges(false);
    }
  }, [
    open,
    topLevelJourneys,
    hasChanges,
    reorderedJourneys,
    resetJourneyReorder,
    setJourneyReorderReorderedJourneys,
    setJourneyReorderHasChanges,
  ]);

  // Initialize SortableJS when dialog is opened and visible
  useEffect(() => {
    if (!open || !isVisible || reorderedJourneys.length === 0) {
      // Clean up when dialog closes
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }
      return;
    }

    // Wait for DOM to be ready and dialog to be fully rendered
    const initializeSortable = () => {
      if (!listContainerRef.current) return;
      
      const rows = listContainerRef.current.querySelectorAll('.journey-row');
      if (rows.length === 0) return;

      // Destroy existing instance if it exists
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }

      sortableInstanceRef.current = Sortable.create(listContainerRef.current, {
        animation: 200,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        draggable: '.journey-row',
        ghostClass: 'opacity-50',
        chosenClass: 'opacity-70',
        dragClass: 'sortable-drag',
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 0,
        swapThreshold: 0.65,
        onStart: (evt: any) => {
          if (evt && evt.item) {
            (evt.item as HTMLElement).style.userSelect = 'none';
            document.body.style.userSelect = 'none';
          }
        },
        onChoose: (evt: any) => {
          if (evt && evt.item) {
            (evt.item as HTMLElement).style.width = getComputedStyle(evt.item).width;
          }
        },
        onEnd: (evt: any) => {
          document.body.style.userSelect = '';
          if (evt && evt.item) {
            (evt.item as HTMLElement).style.userSelect = '';
          }
          const { oldIndex, newIndex } = evt;
          if (oldIndex === newIndex || oldIndex === undefined || newIndex === undefined) return;
          updateJourneyReorderOrder(oldIndex, newIndex);
        },
      });
    };

    // Use requestAnimationFrame to ensure DOM is ready, then add a small delay
    let timer: ReturnType<typeof setTimeout>;
    const rafId = requestAnimationFrame(() => {
      timer = setTimeout(initializeSortable, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
      if (sortableInstanceRef.current) {
        sortableInstanceRef.current.destroy();
        sortableInstanceRef.current = null;
      }
    };
  }, [open, isVisible, reorderedJourneys.length, updateJourneyReorderOrder]);

  // Handle visibility and animations
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsExiting(false);
      const timer = setTimeout(() => {
        setIsEntering(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsExiting(true);
      setIsEntering(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const hasUnsavedChanges = () => {
    if (!hasChanges || reorderedJourneys.length === 0) return false;
    const originalOrder = [...topLevelJourneys]
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
      .map((j) => j.id);
    const currentOrder = reorderedJourneys.map((j) => j.id);
    return JSON.stringify(originalOrder) !== JSON.stringify(currentOrder);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const journeyIds = reorderedJourneys.map((j) => j.id);
      await onReorder(journeyIds);
      resetJourneyReorder();
      onClose();
    } catch (error) {
      console.error('Failed to reorder journeys:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when dialog closes without saving
      resetJourneyReorder();
      onClose();
    }
  };

  const handleCancel = () => {
    // Reset state when canceling
    resetJourneyReorder();
    onClose();
  };

  const dialogBackdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1001,
    opacity: isExiting ? 0 : isEntering ? 1 : 0,
    transition: 'opacity 150ms ease',
  };

  const dialogPopupStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: isExiting
      ? 'translate(-50%, -48%) scale(0.96)'
      : isEntering
      ? 'translate(-50%, -50%) scale(1)'
      : 'translate(-50%, -48%) scale(0.96)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    backgroundColor: 'var(--surface-1)',
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1002,
    opacity: isExiting ? 0 : isEntering ? 1 : 0,
    transition: 'all 150ms ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const dialogHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-lg)',
    borderBottomWidth: 'var(--border-width-sm)',
    borderBottomStyle: 'var(--border-style)' as React.CSSProperties['borderBottomStyle'],
    borderBottomColor: 'var(--color-border)',
  };

  const dialogTitleStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const dialogContentStyle: React.CSSProperties = {
    padding: 'var(--spacing-lg)',
    overflowY: 'auto',
    flex: 1,
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-lg)',
    borderTopWidth: 'var(--border-width-sm)',
    borderTopStyle: 'var(--border-style)' as React.CSSProperties['borderTopStyle'],
    borderTopColor: 'var(--color-border)',
  };

  if (!isVisible) return null;

  return (
    <Dialog.Root open={true} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop style={dialogBackdropStyle} onClick={onClose} />
        <Dialog.Popup style={dialogPopupStyle}>
          <div style={dialogHeaderStyle}>
            <Dialog.Title style={dialogTitleStyle}>Reorder Journeys</Dialog.Title>
            <Button
              icon={X}
              iconOnly
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close"
            />
          </div>

          <div style={dialogContentStyle}>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              Drag and drop journeys to reorder them. Click Save to apply changes.
            </p>

            {reorderedJourneys.length > 0 ? (
              <div ref={listContainerRef} style={listStyle}>
                {reorderedJourneys.map((journey, index) => (
                  <JourneyItem key={journey.id} journey={journey} index={index} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-lg)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                No journeys to reorder
              </div>
            )}
          </div>

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              state={isSubmitting ? 'loading' : 'default'}
              disabled={!hasChanges || isSubmitting || !hasUnsavedChanges()}
            >
              Save Order
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

