/**
 * Attribute Pill Component
 * Displays an attribute as a pill/badge with type-specific styling
 */

import React, { useRef } from 'react';
import type { Attribute } from '../../types';
import { AttributeSelectorMenu } from './AttributeSelectorMenu';
import { getAttributeTypeInfo } from './attributeTypes';
import { useAppStore } from '../../store';

interface AttributeTypeStyle {
  icon: React.ComponentType<any> | null;
  colorHex: string;
  bgClass: string;
  textClass: string;
  darkBgClass: string;
  darkTextClass: string;
  iconClass: string;
}

/**
 * Maps attribute types to their CSS class names for pills
 */
function getPillStyleClasses(typeKey: string): Omit<AttributeTypeStyle, 'icon' | 'colorHex'> {
  const classMap: Record<string, Omit<AttributeTypeStyle, 'icon' | 'colorHex'>> = {
    actor: {
      bgClass: 'attr-pill-actor-bg',
      textClass: 'attr-pill-actor-text',
      darkBgClass: 'attr-pill-actor-bg-dark',
      darkTextClass: 'attr-pill-actor-text-dark',
      iconClass: 'attr-pill-actor-icon',
    },
    action: {
      bgClass: 'attr-pill-action-bg',
      textClass: 'attr-pill-action-text',
      darkBgClass: 'attr-pill-action-bg-dark',
      darkTextClass: 'attr-pill-action-text-dark',
      iconClass: 'attr-pill-action-icon',
    },
    thing: {
      bgClass: 'attr-pill-thing-bg',
      textClass: 'attr-pill-thing-text',
      darkBgClass: 'attr-pill-thing-bg-dark',
      darkTextClass: 'attr-pill-thing-text-dark',
      iconClass: 'attr-pill-thing-icon',
    },
    channel: {
      bgClass: 'attr-pill-channel-bg',
      textClass: 'attr-pill-channel-text',
      darkBgClass: 'attr-pill-channel-bg-dark',
      darkTextClass: 'attr-pill-channel-text-dark',
      iconClass: 'attr-pill-channel-icon',
    },
    system: {
      bgClass: 'attr-pill-system-bg',
      textClass: 'attr-pill-system-text',
      darkBgClass: 'attr-pill-system-bg-dark',
      darkTextClass: 'attr-pill-system-text-dark',
      iconClass: 'attr-pill-system-icon',
    },
    place: {
      bgClass: 'attr-pill-place-bg',
      textClass: 'attr-pill-place-text',
      darkBgClass: 'attr-pill-place-bg-dark',
      darkTextClass: 'attr-pill-place-text-dark',
      iconClass: 'attr-pill-place-icon',
    },
    word: {
      bgClass: 'attr-pill-word-bg',
      textClass: 'attr-pill-word-text',
      darkBgClass: 'attr-pill-word-bg-dark',
      darkTextClass: 'attr-pill-word-text-dark',
      iconClass: 'attr-pill-word-icon',
    },
  };

  return (
    classMap[typeKey] || {
      bgClass: 'attr-pill-default-bg',
      textClass: 'attr-pill-default-text',
      darkBgClass: 'attr-pill-default-bg-dark',
      darkTextClass: 'attr-pill-default-text-dark',
      iconClass: 'attr-pill-default-icon',
    }
  );
}

interface AttributePillProps {
  attribute: Attribute;
  isSelected?: boolean;
  isFocused?: boolean;
  onAttributeSelect?: (attr: Attribute) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  allAttributes: Attribute[];
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  stepId: string;
  attrIdx: number;
  onStepSelect?: (stepId: string) => void;
  onRemove: () => void;
  allStepAttributes: Attribute[];
  teamId?: string;
  projectId?: string;
  onAttributeCreated?: (attr: Attribute) => void;
}

export const AttributePill = React.forwardRef<HTMLDivElement, AttributePillProps>(
  function AttributePill(
    {
      attribute,
      isSelected = false,
      isFocused = false,
      onAttributeSelect,
      onMouseDown,
      allAttributes,
      menuOpen,
      onMenuToggle,
      onMenuClose,
      stepId,
      attrIdx,
      onStepSelect,
      onRemove,
      allStepAttributes,
      teamId,
      projectId,
      onAttributeCreated,
    },
    ref
  ) {
    const typeKey = (attribute.type || '').toLowerCase();
    const typeInfo = getAttributeTypeInfo(typeKey);
    const styleClasses = getPillStyleClasses(typeKey);
    const Icon = typeInfo.icon;
    const fallbackRef = useRef<HTMLDivElement>(null);
    const anchorRef =
      ref && typeof ref === 'object'
        ? (ref as React.RefObject<HTMLDivElement>)
        : fallbackRef;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();

      // If clicking to close the menu, just close it
      if (menuOpen) {
        onMenuToggle();
        return;
      }

      // Single click opens the menu directly
      _openMenu();
    };

    const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      _openMenu();
    };

    const _openMenu = () => {
      // Select the attribute when opening the menu
      onAttributeSelect && onAttributeSelect(attribute);

      // Deselect all nodes and edges in React Flow but keep step selected for context
      document
        .querySelectorAll(
          '.react-flow__node.selected, .react-flow__edge.selected, .react-flow__edge-path.selected'
        )
        .forEach((el) => el.classList.remove('selected'));

      window.dispatchEvent(
        new CustomEvent('attribute-menu-open', { detail: { stepId, attrIdx } })
      );

      // Ensure the step remains selected so AttributeComposer keeps its context and data
      onStepSelect && onStepSelect(stepId);

      onMenuToggle();
    };

    const handleSelect = (attr: Attribute) => {
      onMenuClose();
      // Modify attribute instance via store optimistic actions
      if (stepId != null && attrIdx != null) {
        const store = useAppStore.getState();
        store.changeStepAttributeOptimistic(stepId, attrIdx, attr).catch(() => {
          // No-op: action reverts on failure
        });
      }
    };

    const handleRemove = () => {
      // Remove attribute instance via store optimistic action
      if (stepId != null && attrIdx != null) {
        const store = useAppStore.getState();
        store.removeStepAttributeOptimistic(stepId, attrIdx).catch(() => {
          // No-op: action reverts on failure
        });
        onRemove();
      }
    };

    // Determine background and text classes based on state
    let bgClass = 'attr-pill-bg-default';
    let textClass = styleClasses.textClass;
    let iconClass = styleClasses.iconClass;
    let shadowClass = 'attr-pill-shadow-default';
    let focusClass = '';

    if (menuOpen || isSelected) {
      bgClass = styleClasses.bgClass;
      textClass = 'attr-pill-text-selected';
      iconClass = 'attr-pill-icon-selected';
      shadowClass = 'attr-pill-shadow-none';
    } else if (isFocused) {
      focusClass = 'attr-pill-focus';
    }

    const menu = menuOpen ? (
      <AttributeSelectorMenu
        anchorRef={anchorRef}
        allAttributes={allAttributes}
        currentValue={attribute}
        onSelect={handleSelect}
        onClose={onMenuClose}
        onRemove={handleRemove}
        excludedAttributeIds={new Set(
          allStepAttributes.map(
            (attr) => attr.id
          )
        )}
        teamId={teamId}
        projectId={projectId}
        onAttributeCreated={onAttributeCreated}
      />
    ) : null;

    return (
      <>
        <div
          ref={(ref as React.RefObject<HTMLDivElement>) ?? fallbackRef}
          onClick={handleClick}
          onContextMenu={handleRightClick}
          onMouseDown={onMouseDown}
          tabIndex={isFocused ? 0 : -1}
          className={`attr-pill ${bgClass} ${textClass} ${shadowClass} ${focusClass} ${!isSelected && !menuOpen ? 'attr-pill-hover' : ''}`}
          title={
            isSelected
              ? `Deselect ${attribute.name}`
              : menuOpen
              ? `Close menu for ${attribute.name}`
              : `Click to edit ${attribute.name}`
          }
        >
          {Icon && (
            <Icon
              size={12}
              weight="regular"
              className={`attr-pill-icon ${iconClass}`}
            />
          )}
          <span className="attr-pill-text" title={attribute.name}>
            {attribute.name}
          </span>
        </div>
        {menu}
      </>
    );
  }
);

