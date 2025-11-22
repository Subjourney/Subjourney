/**
 * DialogJourneyReorder Component
 * Dialog for reordering top-level journeys in a project
 */

import React, { useState, useEffect } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { X, DotsNine } from '@phosphor-icons/react';
import { Button } from './Button';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import type { Journey } from '../../types';

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

interface DraggableJourneyItemProps {
  journey: Journey;
}

function DraggableJourneyItem({ journey }: DraggableJourneyItemProps) {
  const sortable = useSortable({
    id: journey.id,
    data: {
      type: 'journey',
      journey,
    },
  });

  return (
    <div
      ref={sortable.ref}
      style={{
        opacity: sortable.isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        borderWidth: 'var(--border-width-sm)',
        borderStyle: 'var(--border-style)',
        borderColor: 'var(--color-border)',
        cursor: sortable.isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          color: 'var(--color-text-secondary)',
        }}
      >
        <DotsNine size={20} weight="bold" />
      </div>
      <div style={{ flex: 1, color: 'var(--color-text-primary)' }}>
        {journey.name}
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
  const [orderedJourneyIds, setOrderedJourneyIds] = useState<string[]>([]);

  // Filter to only top-level journeys (not subjourneys) and sort by sequence_order
  const topLevelJourneys = journeys
    .filter((j) => !j.is_subjourney)
    .sort((a, b) => {
      const orderA = a.sequence_order ?? 0;
      const orderB = b.sequence_order ?? 0;
      return orderA - orderB;
    });

  // Initialize ordered journey IDs when dialog opens
  useEffect(() => {
    if (open) {
      setOrderedJourneyIds(topLevelJourneys.map((j) => j.id));
    }
  }, [open, topLevelJourneys]);

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

  const handleDragEnd = (event: any, _manager: any) => {
    const { operation, canceled } = event;
    if (canceled || !operation?.source || !operation?.target) return;

    const { source, target } = operation;
    const activeId = String(source.id);
    const overId = String(target.id);

    if (activeId === overId) return;

    const activeIndex = orderedJourneyIds.indexOf(activeId);
    const overIndex = orderedJourneyIds.indexOf(overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const newOrder = [...orderedJourneyIds];
    newOrder.splice(activeIndex, 1);
    newOrder.splice(overIndex, 0, activeId);

    setOrderedJourneyIds(newOrder);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onReorder(orderedJourneyIds);
      onClose();
    } catch (error) {
      console.error('Failed to reorder journeys:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
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
    borderBottomStyle: 'var(--border-style)',
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
    borderTopStyle: 'var(--border-style)',
    borderTopColor: 'var(--color-border)',
  };

  if (!isVisible) return null;

  const orderedJourneys = orderedJourneyIds
    .map((id) => topLevelJourneys.find((j) => j.id === id))
    .filter((j): j is Journey => !!j);

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
            {topLevelJourneys.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-lg)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                No journeys to reorder
              </div>
            ) : (
              <DragDropProvider onDragEnd={handleDragEnd}>
                <div style={listStyle}>
                  {orderedJourneys.map((journey) => (
                    <DraggableJourneyItem key={journey.id} journey={journey} />
                  ))}
                </div>
              </DragDropProvider>
            )}
          </div>

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              state={isSubmitting ? 'loading' : 'default'}
              disabled={isSubmitting || topLevelJourneys.length === 0}
            >
              Save Order
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

