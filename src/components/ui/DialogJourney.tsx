/**
 * DialogJourney Component
 * Dialog for creating a new journey using Base UI Dialog
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { X } from '@phosphor-icons/react';
import { InputWithLabel } from './InputWithLabel';
import { TextAreaWithLabel } from './TextAreaWithLabel';
import { Button } from './Button';
import { DialogConfirm } from './DialogConfirm';
import type { Journey } from '../../types';
import { journeysApi } from '../../api';
import { PHASE_COLORS } from '../../utils/phaseColors';

export interface DialogJourneyProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when journey is created */
  onSubmit?: (journey: Journey) => void;
  /** Optional journey data for edit mode */
  journeyData?: Partial<Journey> | null;
  /** Project ID for creating new journeys */
  projectId: string;
}

export function DialogJourney({
  open,
  onClose,
  onSubmit,
  journeyData = null,
  projectId,
}: DialogJourneyProps) {
  const isEditMode = !!journeyData;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [originalData, setOriginalData] = useState<{ name: string; description: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle visibility and animations - matching reference Dialog pattern
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsExiting(false);
      // Trigger entrance animation after a small delay
      const timer = setTimeout(() => {
        setIsEntering(true);
        // Focus the first input after animation starts
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsExiting(true);
      setIsEntering(false);
      // Wait for exit animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Reset form when closing
        setFormData({ name: '', description: '' });
        setErrors({});
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Prefill form when editing and track original data
  useEffect(() => {
    if (journeyData && open) {
      const initialData = {
        name: journeyData.name || '',
        description: journeyData.description || '',
      };
      setFormData(initialData);
      setOriginalData(initialData);
    } else if (!journeyData && open) {
      // Reset form for new journey
      const initialData = { name: '', description: '' };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [journeyData, open]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!isEditMode || !originalData) return false;
    return (
      formData.name.trim() !== originalData.name.trim() ||
      formData.description.trim() !== originalData.description.trim()
    );
  };

  const handleInputChange = (field: 'name' | 'description', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Journey name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Journey name must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && journeyData?.id) {
        // Edit mode - update journey
        const updatedJourney = await journeysApi.updateJourney(journeyData.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        onSubmit?.(updatedJourney);
      } else {
        // Create mode - create new journey
        const newJourney = await journeysApi.createJourney({
          project_id: projectId,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        
        // Create initial phase and step
        try {
          // Randomly select a color from the palette
          const randomColorIndex = Math.floor(Math.random() * PHASE_COLORS.length);
          const phase = await journeysApi.createPhase(newJourney.id, {
            name: 'Phase 1',
            sequence_order: 0,
            color: PHASE_COLORS[randomColorIndex],
          });
          
          // Create initial step in the phase
          await journeysApi.createStep(phase.id, {
            name: 'Step 1',
            sequence_order: 0,
          });
        } catch (phaseError) {
          console.error('Failed to create initial phase/step:', phaseError);
          // Continue anyway - journey was created successfully
        }
        
        onSubmit?.(newJourney);
      }

      // Update original data after successful save
      setOriginalData({
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
      // Reset form
      setFormData({ name: '', description: '' });
      setErrors({});
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} journey:`, error);
      setErrors({
        submit: `Failed to ${isEditMode ? 'update' : 'create'} journey. Please try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (force: boolean = false) => {
    // Check for unsaved changes before closing (only in edit mode)
    if (!force && isEditMode && hasUnsavedChanges()) {
      setShowConfirmDialog(true);
      return;
    }

    setIsExiting(true);
    setIsEntering(false);
    setShowConfirmDialog(false);
    // Wait for exit animation to complete before calling onClose
    setTimeout(() => {
      onClose();
      // Reset form when closing
      setFormData({ name: '', description: '' });
      setErrors({});
      setOriginalData(null);
    }, 150);
  };

  const handleCloseClick = () => {
    handleClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false);
    // Force close after confirmation
    handleClose(true);
  };

  const handleCancelDiscard = () => {
    setShowConfirmDialog(false);
    // Return to editing - do nothing, dialog stays open
  };

  const dialogBackdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    zIndex: 1000,
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
    maxWidth: '500px',
    maxHeight: '90vh',
    backgroundColor: 'var(--surface-1)',
    borderRadius: 'var(--radius-lg)',
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: 'var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1001,
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
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: 0,
    background: 'var(--surface-2)',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
  };

  const dialogContentStyle: React.CSSProperties = {
    padding: 'var(--spacing-lg)',
    overflowY: 'auto',
    flex: 1,
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  };

  const submitErrorStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-error)',
    textAlign: 'center',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    paddingTop: 'var(--spacing-md)',
  };

  if (!isVisible) return null;

  return (
    <>
      <Dialog.Root open={true} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop style={dialogBackdropStyle} onClick={handleCloseClick} />
        <Dialog.Popup style={dialogPopupStyle}>
          <div style={dialogHeaderStyle}>
            <Dialog.Title style={dialogTitleStyle}>
              {isEditMode ? 'Edit Journey' : 'New Journey'}
            </Dialog.Title>
            <button type="button" onClick={handleCloseClick} style={closeButtonStyle}>
              <X size={16} weight="bold" />
            </button>
          </div>

          <div style={dialogContentStyle}>
            <form onSubmit={handleSubmit} style={formStyle}>
              {/* Journey Name Input */}
              <InputWithLabel
                ref={nameInputRef}
                id="journey-name"
                label="Journey name"
                placeholder="Give your journey a name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
              />

              {/* Description Textarea */}
              <TextAreaWithLabel
                id="journey-description"
                label="Description"
                placeholder="Give your journey a brief description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                maxLength={256}
                characterCount={formData.description.length}
                error={errors.description}
                rows={4}
                style={{ minHeight: '100px' }}
              />

              {/* Submit Error */}
              {errors.submit && <div style={submitErrorStyle}>{errors.submit}</div>}

              {/* Submit Button */}
              <div style={actionsStyle}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseClick}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  state={isSubmitting ? 'loading' : 'default'}
                  disabled={isSubmitting || (isEditMode && !hasUnsavedChanges())}
                >
                  {isEditMode ? 'Update Journey' : 'Create Journey'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <DialogConfirm
      open={showConfirmDialog}
      onClose={() => setShowConfirmDialog(false)}
      onConfirm={handleConfirmDiscard}
      onCancel={handleCancelDiscard}
      title="Discard changes?"
      message="You have unsaved changes. Are you sure you want to discard them?"
      confirmLabel="Discard"
      cancelLabel="Cancel"
      confirmVariant="danger"
    />
    </>
  );
}

