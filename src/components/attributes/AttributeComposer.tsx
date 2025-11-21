/**
 * Attribute Composer Component
 * Manages attribute instances for a step
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { AttributePill } from './AttributePill';
import { AttributeSelectorMenu } from './AttributeSelectorMenu';
import { useAppStore, useSelection } from '../../store';
import type { Attribute } from '../../types';

interface AttributeComposerProps {
  stepId: string;
  attributes: Attribute[];
  selectedAttribute: Attribute | null;
  onAttributeSelect: (attr: Attribute | null) => void;
  allAttributes: Attribute[];
  onAnyMenuOpen?: (open: boolean) => void;
  onStepSelect?: (stepId: string) => void;
  context?: string;
  teamId?: string;
  projectId?: string;
  onAttributeCreated?: (attr: Attribute) => void;
  focusedPillIndex: number | null;
  onPillFocus: (index: number | null) => void;
  onPillBlur: () => void;
}

export const AttributeComposer = React.memo(function AttributeComposer({
  stepId,
  attributes,
  selectedAttribute,
  onAttributeSelect,
  allAttributes,
  onAnyMenuOpen,
  onStepSelect,
  context = 'canvas',
  teamId,
  projectId,
  onAttributeCreated,
  focusedPillIndex,
  onPillFocus,
  onPillBlur,
}: AttributeComposerProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addButtonRef = useRef<HTMLDivElement>(null);
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<React.RefObject<HTMLDivElement>>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // ===== ZUSTAND SELECTION SYSTEM =====
  const { selectedStep, selectedPhase, selectedJourney } = useSelection();

  // Global keyboard listener for initial navigation when step is selected
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if this step is selected and no pill is currently focused
      if (
        selectedStep === stepId &&
        focusedPillIndex === null &&
        (e.ctrlKey || e.metaKey) &&
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Focus the container first, then start navigation
        if (containerRef.current) {
          containerRef.current.focus();
        }

        // Start navigation with first item
        const nextIndex = 0;
        onPillFocus(nextIndex);

        // Focus the appropriate element
        if (nextIndex < attributes.length) {
          // Focus an attribute pill and open its menu
          const pillRef = pillRefs.current[nextIndex];
          if (pillRef && pillRef.current) {
            pillRef.current.focus();
            // Close add menu and open the menu for the focused pill
            setIsAddMenuOpen(false);
            setOpenMenuIndex(nextIndex);
          }
        } else {
          // Focus the add button and open its menu
          if (addButtonRef.current) {
            addButtonRef.current.focus();
            // Close any attribute pill menu and open add menu
            setOpenMenuIndex(null);
            setIsAddMenuOpen(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedStep, stepId, focusedPillIndex, onPillFocus, attributes.length]);

  React.useEffect(() => {
    function handleGlobalOpen(e: Event) {
      const customEvent = e as CustomEvent;
      const { stepId: otherStepId } = customEvent.detail || {};
      if (otherStepId !== stepId) {
        setOpenMenuIndex(null);
        setIsAddMenuOpen(false);
      }
    }
    window.addEventListener('attribute-menu-open', handleGlobalOpen);
    return () => window.removeEventListener('attribute-menu-open', handleGlobalOpen);
  }, [stepId]);

  React.useEffect(() => {
    if (onAnyMenuOpen) onAnyMenuOpen(openMenuIndex !== null || isAddMenuOpen);
  }, [openMenuIndex, isAddMenuOpen, onAnyMenuOpen]);

  // Listen for global close event
  React.useEffect(() => {
    function handleClose() {
      setOpenMenuIndex(null);
      setIsAddMenuOpen(false);
    }
    window.addEventListener('attribute-menu-close', handleClose);
    return () => window.removeEventListener('attribute-menu-close', handleClose);
  }, []);

  // Close both menus when step becomes unselected
  React.useEffect(() => {
    if (selectedStep !== stepId) {
      setOpenMenuIndex(null);
      setIsAddMenuOpen(false);
    }
  }, [selectedStep, stepId]);

  // Close both menus when phase or journey is selected (different from current step)
  React.useEffect(() => {
    if (selectedPhase || selectedJourney) {
      setOpenMenuIndex(null);
      setIsAddMenuOpen(false);
    }
  }, [selectedPhase, selectedJourney, stepId]);

  // Memoize event handlers for better performance
  const handleAddButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const willOpen = !isAddMenuOpen;

      // Only deselect ReactFlow nodes, but keep step selected for context
      document
        .querySelectorAll(
          '.react-flow__node.selected, .react-flow__edge.selected, .react-flow__edge-path.selected'
        )
        .forEach((el) => el.classList.remove('selected'));

      if (willOpen) {
        // Close any open attribute pill menus before opening add menu (mutual exclusion)
        setOpenMenuIndex(null);

        window.dispatchEvent(
          new CustomEvent('attribute-menu-open', { detail: { stepId, attrIdx: 'add' } })
        );
        // Explicitly ensure the step remains selected for context consistency
        onStepSelect && onStepSelect(stepId);
      }

      setIsAddMenuOpen(willOpen);
    },
    [isAddMenuOpen, stepId, allAttributes, onStepSelect]
  );

  const handleAddMenuClose = useCallback(() => {
    setIsAddMenuOpen(false);
  }, []);

  const handleAddMenuSelect = useCallback(
    (attr: Attribute) => {
      handleAddMenuClose();
      // Add the new attribute to the step's attributes (optimistic via store)
      if (stepId != null) {
        const store = useAppStore.getState();
        store.addStepAttributeOptimistic(stepId, attr).catch(() => {
          // No-op: action reverts on failure
        });
      }
      // Clear focus state after adding new attribute
      onPillBlur();
      // Clear selection state to reset visual appearance
      onAttributeSelect(null);
    },
    [stepId, handleAddMenuClose, onPillBlur, onAttributeSelect]
  );

  const handleAttributeSelect = useCallback(
    (attr: Attribute) => {
      // Close the add menu if it's open when an attribute is selected
      if (isAddMenuOpen) {
        setIsAddMenuOpen(false);
      }
      // Call the original onAttributeSelect
      onAttributeSelect && onAttributeSelect(attr);
    },
    [isAddMenuOpen, onAttributeSelect]
  );

  const handleAttributeRemove = useCallback(
    (attrIdx: number) => {
      // Remove attribute instance via store (optimistic)
      if (stepId != null) {
        const store = useAppStore.getState();
        store.removeStepAttributeOptimistic(stepId, attrIdx).catch(() => {
          // No-op: action reverts on failure
        });
      }
    },
    [stepId]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // If typing in an input/textarea/contentEditable, allow editing keys to pass through
      const target = e.target as HTMLElement;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (
        isTextInput &&
        (e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ' || e.key === 'Spacebar')
      ) {
        return;
      }

      // Check for Ctrl/Cmd + Arrow keys for navigation
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        e.stopPropagation();

        const totalItems = attributes.length + 1; // +1 for the add button
        let nextIndex: number | null;

        if (e.key === 'ArrowLeft') {
          // Ctrl/Cmd + Left Arrow - go backwards
          if (focusedPillIndex === null) {
            // If no pill is focused, start from the last item
            nextIndex = totalItems - 1;
          } else if (focusedPillIndex === 0) {
            // If at first item, exit focus
            nextIndex = null;
          } else {
            // Go to previous item
            nextIndex = focusedPillIndex - 1;
          }
        } else {
          // Ctrl/Cmd + Right Arrow - go forwards
          if (focusedPillIndex === null) {
            // If no pill is focused, start from the first item
            nextIndex = 0;
          } else if (focusedPillIndex === totalItems - 1) {
            // If at last item, exit focus
            nextIndex = null;
          } else {
            // Go to next item
            nextIndex = focusedPillIndex + 1;
          }
        }

        onPillFocus(nextIndex);

        // Focus the appropriate element
        if (nextIndex !== null) {
          if (nextIndex < attributes.length) {
            // Focus an attribute pill and open its menu
            const pillRef = pillRefs.current[nextIndex];
            if (pillRef && pillRef.current) {
              pillRef.current.focus();
              // Close add menu and open the menu for the focused pill
              setIsAddMenuOpen(false);
              setOpenMenuIndex(nextIndex);
            }
          } else {
            // Focus the add button and open its menu
            if (addButtonRef.current) {
              addButtonRef.current.focus();
              // Close any attribute pill menu and open add menu
              setOpenMenuIndex(null);
              setIsAddMenuOpen(true);
            }
          }
        } else {
          // Blur all pills and close menus
          onPillBlur();
          setOpenMenuIndex(null);
          setIsAddMenuOpen(false);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();

        if (focusedPillIndex !== null) {
          if (focusedPillIndex < attributes.length) {
            // Toggle the focused attribute pill's menu (since it's already open when navigating)
            setOpenMenuIndex(openMenuIndex === focusedPillIndex ? null : focusedPillIndex);
          } else {
            // Toggle the add menu (since it's already open when navigating)
            setIsAddMenuOpen(!isAddMenuOpen);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();

        // Only delete if we have a focused attribute pill (not the add button)
        if (focusedPillIndex !== null && focusedPillIndex < attributes.length) {
          // Remove the focused attribute
          handleAttributeRemove(focusedPillIndex);

          // Close the menu and adjust focus
          setOpenMenuIndex(null);

          // Adjust focus to the next available item or exit focus
          const remainingItems = attributes.length - 1; // -1 because we're removing one
          if (remainingItems === 0) {
            // No more attributes, focus the add button
            onPillFocus(0); // Add button is at index 0 when no attributes
            if (addButtonRef.current) {
              addButtonRef.current.focus();
              setIsAddMenuOpen(true);
            }
          } else if (focusedPillIndex >= remainingItems) {
            // We were at the last attribute, focus the new last attribute
            const newIndex = remainingItems - 1;
            onPillFocus(newIndex);
            const pillRef = pillRefs.current[newIndex];
            if (pillRef && pillRef.current) {
              pillRef.current.focus();
              setOpenMenuIndex(newIndex);
            }
          } else {
            // Focus the same index (which will now be the next attribute)
            const pillRef = pillRefs.current[focusedPillIndex];
            if (pillRef && pillRef.current) {
              pillRef.current.focus();
              setOpenMenuIndex(focusedPillIndex);
            }
          }
        }
      } else if (e.key === 'Escape') {
        // Close any open menus
        setOpenMenuIndex(null);
        setIsAddMenuOpen(false);
        onPillBlur();
        // Clear selection state to reset visual appearance
        onAttributeSelect(null);
      }
    },
    [
      focusedPillIndex,
      attributes.length,
      onPillFocus,
      onPillBlur,
      openMenuIndex,
      handleAddButtonClick,
      handleAttributeRemove,
      onAttributeSelect,
    ]
  );

  // Memoize the attributes mapping for better performance
  const attributePills = useMemo(() => {
    return attributes.map((attr, idx) => {
      const isSelected = !!(selectedAttribute && selectedAttribute.id === attr.id);
      const isFocused = focusedPillIndex === idx;

      // Initialize refs array if needed
      if (!pillRefs.current[idx]) {
        pillRefs.current[idx] = React.createRef<HTMLDivElement>();
      }

      return (
        <AttributePill
          key={`${attr.id}-${idx}`}
          ref={pillRefs.current[idx]}
          attribute={attr}
          isSelected={isSelected}
          isFocused={isFocused}
          onAttributeSelect={handleAttributeSelect}
          onMouseDown={(e) => e.stopPropagation()}
          allAttributes={allAttributes}
          menuOpen={openMenuIndex === idx}
          onMenuToggle={() => {
            // Close the add menu if it's open when toggling another pill's menu
            if (isAddMenuOpen) setIsAddMenuOpen(false);
            setOpenMenuIndex(openMenuIndex === idx ? null : idx);
          }}
          onMenuClose={() => {
            setOpenMenuIndex(null);
            // Clear focus state when menu closes after selection
            onPillBlur();
            // Clear selection state to reset visual appearance
            onAttributeSelect(null);
          }}
          stepId={stepId}
          attrIdx={idx}
          onStepSelect={onStepSelect}
          onRemove={() => handleAttributeRemove(idx)}
          allStepAttributes={attributes}
          teamId={teamId}
          projectId={projectId}
          onAttributeCreated={onAttributeCreated}
        />
      );
    });
  }, [
    attributes,
    selectedAttribute,
    focusedPillIndex,
    handleAttributeSelect,
    allAttributes,
    openMenuIndex,
    isAddMenuOpen,
    stepId,
    onStepSelect,
    handleAttributeRemove,
    teamId,
    projectId,
    onAttributeCreated,
    onPillBlur,
    onAttributeSelect,
  ]);

  return (
    <div
      ref={containerRef}
      className="attribute-composer"
      onKeyDown={handleKeyDown}
      tabIndex={focusedPillIndex === null ? 0 : -1}
    >
      <div className="attribute-composer-pills" ref={pillsContainerRef}>
        {attributePills}
        {/* "+ Click" button */}
        <div
          ref={addButtonRef}
          onClick={handleAddButtonClick}
          tabIndex={focusedPillIndex === attributes.length ? 0 : -1}
          className={`attribute-composer-add-button ${isAddMenuOpen ? 'attribute-composer-add-button-open' : focusedPillIndex === attributes.length ? 'attribute-composer-add-button-focused' : ''}`}
        >
          <span className="attribute-composer-add-icon">+</span>
          <span className="attribute-composer-add-text">Click</span>
        </div>
      </div>
      {/* Add menu */}
      {isAddMenuOpen && (
        <AttributeSelectorMenu
          anchorRef={addButtonRef}
          allAttributes={allAttributes}
          currentValue={null}
          onSelect={handleAddMenuSelect}
          onClose={handleAddMenuClose}
          expandAllByDefault={true}
          context={context}
          excludedAttributeIds={new Set(attributes.map((attr) => attr.id))}
          teamId={teamId}
          projectId={projectId}
          onAttributeCreated={onAttributeCreated}
        />
      )}
    </div>
  );
});

