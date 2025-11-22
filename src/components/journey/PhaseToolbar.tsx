/**
 * Phase Toolbar Component
 * Toolbar that appears when a phase is selected, providing quick actions
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { TextAlignLeft, Sparkle, Plus, Trash } from '@phosphor-icons/react';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';
import { Button } from '../ui/Button';
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
    addPhaseToRightOptimistic,
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
          handleDeletePhase();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        tabIndex={focusedIndex === 0 ? 0 : -1}
        title="Delete phase"
        aria-label="Delete phase"
      />

      <div className="step-toolbar-divider" />

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
        focusRing={focusedIndex === 1 ? 'default' : 'none'}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement text align action
        }}
        tabIndex={focusedIndex === 1 ? 0 : -1}
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
        focusRing={focusedIndex === 2 ? 'default' : 'none'}
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Implement sparkle action
        }}
        tabIndex={focusedIndex === 2 ? 0 : -1}
        title="Sparkle action"
        aria-label="Sparkle action"
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
        focusRing={focusedIndex === 3 ? 'default' : 'none'}
        onClick={async (e) => {
          e.stopPropagation();
          if (phase.id) {
            await addPhaseToRightOptimistic(phase.id);
          }
        }}
        tabIndex={focusedIndex === 3 ? 0 : -1}
        title="Add phase to the right"
        aria-label="Add phase to the right"
      />
    </div>
  );
}

