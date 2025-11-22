/**
 * DialogConfirm Component
 * Confirmation dialog that appears above other dialogs
 */

import React, { useState, useEffect } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Button } from './Button';

export interface DialogConfirmProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when user confirms (discard changes) */
  onConfirm: () => void;
  /** Callback when user cancels (return to editing) */
  onCancel: () => void;
  /** Title of the confirmation dialog */
  title?: string;
  /** Message to display */
  message?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Variant for confirm button */
  confirmVariant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function DialogConfirm({
  open,
  onClose,
  onConfirm,
  onCancel,
  title = 'Discard changes?',
  message = 'You have unsaved changes. Are you sure you want to discard them?',
  confirmLabel = 'Discard',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
}: DialogConfirmProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleCancel();
    }
  };

  const dialogBackdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1002,
    opacity: isExiting ? 0 : isEntering ? 1 : 0,
    transition: 'opacity 150ms ease',
  };

  const dialogPopupStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: isExiting
      ? 'translate(-50%, -50%) scale(0.9)'
      : isEntering
        ? 'translate(-50%, -50%) scale(1)'
        : 'translate(-50%, -50%) scale(0.9)',
    width: '90%',
    maxWidth: '400px',
    backgroundColor: 'var(--surface-1)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: 'var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1003,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    opacity: isExiting ? 0 : isEntering ? 1 : 0,
    transition: 'transform 150ms ease, opacity 150ms ease',
  };

  const dialogHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  };

  const messageStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    padding: 'var(--spacing-lg)',
    paddingTop: 'var(--spacing-md)',
    borderTopWidth: 'var(--border-width-sm)',
    borderTopStyle: 'var(--border-style)',
    borderTopColor: 'var(--color-border)',
  };

  if (!isVisible) return null;

  return (
    <Dialog.Root open={true} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop style={dialogBackdropStyle} onClick={handleCancel} />
        <Dialog.Popup style={dialogPopupStyle}>
          <div style={dialogHeaderStyle}>
            <Dialog.Title style={dialogTitleStyle}>{title}</Dialog.Title>
          </div>

          <div style={dialogContentStyle}>
            <p style={messageStyle}>{message}</p>
          </div>

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

