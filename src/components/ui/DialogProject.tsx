/**
 * DialogProject Component
 * Dialog for creating a new project using Base UI Dialog
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { X } from '@phosphor-icons/react';
import { InputWithLabel } from './InputWithLabel';
import { TextAreaWithLabel } from './TextAreaWithLabel';
import { Button } from './Button';
import { DialogConfirm } from './DialogConfirm';
import type { Project } from '../../types';
import { projectsApi } from '../../api';

export interface DialogProjectProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when project is created */
  onSubmit?: (project: Project) => void;
  /** Optional project data for edit mode */
  projectData?: Partial<Project> | null;
  /** Team ID for creating new projects */
  teamId: string;
}

export function DialogProject({
  open,
  onClose,
  onSubmit,
  projectData = null,
  teamId,
}: DialogProjectProps) {
  const isEditMode = !!projectData;

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
    if (projectData && open) {
      const initialData = {
        name: projectData.name || '',
        description: projectData.description || '',
      };
      setFormData(initialData);
      setOriginalData(initialData);
    } else if (!projectData && open) {
      // Reset form for new project
      const initialData = { name: '', description: '' };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [projectData, open]);

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
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
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
      if (isEditMode && projectData?.id) {
        // Edit mode - update project
        const updatedProject = await projectsApi.updateProject(projectData.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        onSubmit?.(updatedProject);
      } else {
        // Create mode - create new project
        const newProject = await projectsApi.createProject({
          team_id: teamId,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        onSubmit?.(newProject);
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
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, error);
      setErrors({
        submit: `Failed to ${isEditMode ? 'update' : 'create'} project. Please try again.`,
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
    border: 'var(--border-default)',
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
    borderBottom: 'var(--border-divider)',
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
    border: 'none',
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
              {isEditMode ? 'Edit Project' : 'New Project'}
            </Dialog.Title>
            <button type="button" onClick={handleCloseClick} style={closeButtonStyle}>
              <X size={16} weight="bold" />
            </button>
          </div>

          <div style={dialogContentStyle}>
            <form onSubmit={handleSubmit} style={formStyle}>
              {/* Project Name Input */}
              <InputWithLabel
                ref={nameInputRef}
                id="project-name"
                label="Project name"
                placeholder="Give your project a name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
              />

              {/* Description Textarea */}
              <TextAreaWithLabel
                id="project-description"
                label="Description"
                placeholder="Give your project a brief description"
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
                  {isEditMode ? 'Update Project' : 'Create Project'}
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

