/**
 * Phase Toolbar Component
 * Toolbar that appears when a phase is selected, providing quick actions
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { TextAlignLeft, Sparkle, Plus, Trash } from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';
import type { Phase } from '../../types';

interface PhaseToolbarProps {
  phase: Phase;
  phaseColor: string;
}

export function PhaseToolbar({ phase, phaseColor }: PhaseToolbarProps) {
  const {
    editingActive,
    setCurrentJourney,
    currentJourney,
  } = useAppStore();
  const { selectedPhase } = useSelection();

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isSelected = selectedPhase === phase.id;
  const shouldShow = isSelected && editingActive;

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

  const handleDeletePhase = useCallback(async () => {
    if (!phase.id || !currentJourney) return;

    try {
      await journeysApi.deletePhase(phase.id);
      // Reload journey to reflect deletion
      if (currentJourney.id) {
        const updatedJourney = await journeysApi.getJourney(currentJourney.id, true);
        setCurrentJourney(updatedJourney);
        // Clear phase selection
        useAppStore.getState().select('selectedPhase', null);
      }
    } catch (error) {
      console.error('Failed to delete phase:', error);
    }
  }, [phase.id, currentJourney, setCurrentJourney]);

  if (!shouldShow) return null;

  const buttonIndex = { current: 0 };
  const getButtonIndex = () => buttonIndex.current++;

  return (
    <div
      className="step-toolbar"
      onKeyDown={handleToolbarKeyDown}
      tabIndex={-1}
      role="toolbar"
      aria-label="Phase actions"
    >
      <button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        className={`step-toolbar-button ${focusedIndex === 0 ? 'step-toolbar-button-focused' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement text align action
        }}
        tabIndex={focusedIndex === 0 ? 0 : -1}
        title="Text align left"
        aria-label="Text align left"
      >
        <TextAlignLeft size={16} className="step-toolbar-icon" />
      </button>

      <button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        className={`step-toolbar-button ${focusedIndex === 1 ? 'step-toolbar-button-focused' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement sparkle action
        }}
        tabIndex={focusedIndex === 1 ? 0 : -1}
        title="Sparkle action"
        aria-label="Sparkle action"
      >
        <Sparkle size={16} className="step-toolbar-icon" />
      </button>

      <button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        className={`step-toolbar-button ${focusedIndex === 2 ? 'step-toolbar-button-focused' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement add step action
        }}
        tabIndex={focusedIndex === 2 ? 0 : -1}
        title="Add step"
        aria-label="Add step"
      >
        <Plus size={16} className="step-toolbar-icon" />
      </button>

      <div className="step-toolbar-divider" />

      <button
        ref={(el) => {
          const idx = getButtonIndex();
          buttonRefs.current[idx] = el;
        }}
        className={`step-toolbar-button step-toolbar-button-danger ${
          focusedIndex === 3 ? 'step-toolbar-button-focused' : ''
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDeletePhase();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        tabIndex={focusedIndex === 3 ? 0 : -1}
        title="Delete phase"
        aria-label="Delete phase"
      >
        <Trash size={16} className="step-toolbar-icon-danger" />
      </button>
    </div>
  );
}

