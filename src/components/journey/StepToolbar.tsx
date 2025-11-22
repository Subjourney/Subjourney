/**
 * Step Toolbar Component
 * Toolbar that appears when a step is selected, providing quick actions
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { TextAlignLeft, Sparkle, Plus, ArrowDown, Trash, Path } from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';
import { flowsApi } from '../../api';
import { Button } from '../ui/Button';
import { DialogConfirm } from '../ui/DialogConfirm';
import type { Step } from '../../types';

interface StepToolbarProps {
  step: Step;
  phaseColor: string;
}

export function StepToolbar({ step, phaseColor }: StepToolbarProps) {
  const {
    selectedFlow,
    editingActive,
    selectedPhase,
    isStepLoading,
    isSubjourneyLoading,
    setSubjourneyLoading,
    setCurrentJourney,
    currentJourney,
    steps,
    getAttributesForStep,
  } = useAppStore();
  const { selectedStep } = useSelection();

  const [isStepInFlow, setIsStepInFlow] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isSelected = selectedStep === step.id;
  const isPhaseSelected = selectedPhase === step.phase_id;
  const shouldShow = isSelected && editingActive && !isPhaseSelected;

  // Check if step is in flow
  useEffect(() => {
    if (!selectedFlow || !step.id) {
      setIsStepInFlow(false);
      return;
    }

    flowsApi
      .getFlowSteps(selectedFlow)
      .then((flowSteps) => {
        const stepIds = flowSteps.map((fs) => fs.step_id);
        setIsStepInFlow(stepIds.includes(step.id));
      })
      .catch(() => {
        setIsStepInFlow(false);
      });
  }, [selectedFlow, step.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!shouldShow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          const availableButtons = buttonRefs.current.filter((ref) => ref !== null);
          if (availableButtons.length > 0) {
            setFocusedIndex(0);
            availableButtons[0]?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldShow]);

  const handleToolbarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const availableButtons = buttonRefs.current.filter((ref) => ref !== null);

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();

        let nextIndex: number;
        if (e.key === 'ArrowLeft') {
          nextIndex = focusedIndex !== null && focusedIndex > 0 ? focusedIndex - 1 : availableButtons.length - 1;
        } else {
          nextIndex = focusedIndex !== null && focusedIndex < availableButtons.length - 1 ? focusedIndex + 1 : 0;
        }

        setFocusedIndex(nextIndex);
        availableButtons[nextIndex]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (focusedIndex !== null && availableButtons[focusedIndex]) {
          availableButtons[focusedIndex]?.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex(null);
      }
    },
    [focusedIndex]
  );

  const handleToggleFlow = useCallback(async () => {
    if (!selectedFlow || !step.id) return;

    try {
      if (isStepInFlow) {
        await flowsApi.removeStepFromFlow(selectedFlow, step.id);
        setIsStepInFlow(false);
      } else {
        // Get current flow steps to determine sequence order
        const flowSteps = await flowsApi.getFlowSteps(selectedFlow);
        const maxOrder = flowSteps.length > 0 ? Math.max(...flowSteps.map((fs) => fs.sequence_order)) : -1;
        await flowsApi.addStepToFlow(selectedFlow, step.id, maxOrder + 1);
        setIsStepInFlow(true);
      }
    } catch (error) {
      console.error('Failed to toggle step in flow:', error);
    }
  }, [selectedFlow, step.id, isStepInFlow]);

  const handleAddStepToRight = useCallback(async () => {
    try {
      await useAppStore.getState().addStepToRightOptimistic(step.id);
    } catch (error) {
      console.error('Failed to add step:', error);
    }
  }, [step.id]);

  const handleCreateSubjourney = useCallback(async () => {
    if (!step.id) return;

    setSubjourneyLoading(step.id, true);

    try {
      const updatedJourney = await journeysApi.createSubjourney(step.id, {
        name: 'Subjourney',
        is_subjourney: true,
      });

      if (currentJourney) {
        setCurrentJourney(updatedJourney);
      }
    } catch (error) {
      console.error('Failed to create subjourney:', error);
    } finally {
      setSubjourneyLoading(step.id, false);
    }
  }, [step.id, currentJourney, setSubjourneyLoading, setCurrentJourney]);

  const performDeleteStep = useCallback(async () => {
    if (!step.id) return;

    // Find the previous step before deletion (for selection)
    const phaseSteps = steps
      .filter((s) => s.phase_id === step.phase_id)
      .sort((a, b) => a.sequence_order - b.sequence_order);
    const currentIndex = phaseSteps.findIndex((s) => s.id === step.id);
    const previousStep = currentIndex > 0 ? phaseSteps[currentIndex - 1] : null;

    try {
      await useAppStore.getState().removeStepOptimistic(step.id);
        // Select the previous step if it exists, otherwise clear selection
        if (previousStep) {
          useAppStore.getState().select('selectedStep', previousStep.id);
        } else {
          useAppStore.getState().select('selectedStep', null);
      }
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  }, [step.id, step.phase_id, steps]);

  const handleDeleteStep = useCallback(() => {
    // Check if step has attributes
    const stepAttributes = getAttributesForStep(step.id);
    if (stepAttributes && stepAttributes.length > 0) {
      // Show confirmation dialog if attributes exist
      setShowDeleteConfirm(true);
    } else {
      // Delete directly if no attributes
      performDeleteStep();
    }
  }, [step.id, getAttributesForStep, performDeleteStep]);

  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    performDeleteStep();
  }, [performDeleteStep]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  if (!shouldShow) return null;

  const buttonIndex = { current: 0 };
  const getButtonIndex = () => buttonIndex.current++;

  return (
    <div
      className="step-toolbar"
      onKeyDown={handleToolbarKeyDown}
      tabIndex={-1}
      role="toolbar"
      aria-label="Step actions"
    >
      <Button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        icon={Trash}
        iconOnly
        size="sm"
        variant="ghost"
        borderRadius="var(--radius-sm)"
        style={{ color: 'var(--color-error)' }}
        className="step-toolbar-button-delete"
        focusRing={focusedIndex === 0 ? 'default' : 'none'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteStep();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        tabIndex={focusedIndex === 0 ? 0 : -1}
        title="Delete step"
        aria-label="Delete step"
      />

      <div className="step-toolbar-divider" />

      {selectedFlow && (
        <>
          <Button
            ref={(el) => {
              const idx = getButtonIndex();
              buttonRefs.current[idx] = el;
            }}
            icon={Path}
            iconOnly
            size="sm"
            variant="ghost"
            borderRadius="var(--radius-sm)"
            style={isStepInFlow ? { backgroundColor: phaseColor, color: '#ffffff' } : {}}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFlow();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            tabIndex={focusedIndex === 1 ? 0 : -1}
            title={isStepInFlow ? 'Step is in flow' : 'Add step to flow'}
            aria-label={isStepInFlow ? 'Remove step from flow' : 'Add step to flow'}
          />
          <div className="step-toolbar-divider" />
        </>
      )}

      <Button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        icon={TextAlignLeft}
        iconOnly
        size="sm"
        variant="ghost"
        borderRadius="var(--radius-sm)"
        focusRing={focusedIndex === (selectedFlow ? 2 : 1) ? 'default' : 'none'}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement text align action
        }}
        tabIndex={focusedIndex === (selectedFlow ? 2 : 1) ? 0 : -1}
        title="Text align left"
        aria-label="Text align left"
      />

      <Button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        icon={Sparkle}
        iconOnly
        size="sm"
        variant="ghost"
        borderRadius="var(--radius-sm)"
        focusRing={focusedIndex === (selectedFlow ? 3 : 2) ? 'default' : 'none'}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement sparkle action
        }}
        tabIndex={focusedIndex === (selectedFlow ? 3 : 2) ? 0 : -1}
        title="Sparkle action"
        aria-label="Sparkle action"
      />

      <Button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        icon={ArrowDown}
        iconOnly
        size="sm"
        variant="ghost"
        borderRadius="var(--radius-sm)"
        state={isSubjourneyLoading(step.id) ? 'loading' : 'default'}
        focusRing={focusedIndex === (selectedFlow ? 4 : 3) ? 'default' : 'none'}
        disabled={isSubjourneyLoading(step.id)}
        onClick={(e) => {
          e.stopPropagation();
          handleCreateSubjourney();
        }}
        tabIndex={focusedIndex === (selectedFlow ? 4 : 3) ? 0 : -1}
        title="Create subjourney"
        aria-label="Create subjourney"
      />

      <Button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        icon={Plus}
        iconOnly
        size="sm"
        variant="ghost"
        borderRadius="var(--radius-sm)"
        state={isStepLoading(step.phase_id) ? 'loading' : 'default'}
        focusRing={focusedIndex === (selectedFlow ? 5 : 4) ? 'default' : 'none'}
        disabled={isStepLoading(step.phase_id)}
        onClick={(e) => {
          e.stopPropagation();
          handleAddStepToRight();
        }}
        tabIndex={focusedIndex === (selectedFlow ? 5 : 4) ? 0 : -1}
        title="Add step to the right"
        aria-label="Add step to the right"
      />

      <DialogConfirm
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete step?"
        message="This step has attributes assigned. Are you sure you want to delete it?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}

