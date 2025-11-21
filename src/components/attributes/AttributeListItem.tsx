/**
 * Attribute List Item Component
 * Individual attribute item in the selector menu
 */

import React, { useState } from 'react';
import type { Attribute } from '../../types';
import { getAttributeTypeInfo } from './attributeTypes';

interface AttributeTypeStyle {
  icon: React.ComponentType<any>;
  colorHex: string;
  darkColorHex: string;
  selectedBg: string;
  keyboardBg: string;
  hoverBg: string;
  text: string;
  selectedText?: string;
}

/**
 * Maps attribute types to their CSS class names for list items
 */
function getListItemStyleClasses(typeKey: string): Omit<AttributeTypeStyle, 'icon' | 'colorHex' | 'darkColorHex'> {
  const classMap: Record<string, Omit<AttributeTypeStyle, 'icon' | 'colorHex' | 'darkColorHex'>> = {
    actor: {
      selectedBg: 'attr-item-actor-selected-bg',
      keyboardBg: 'attr-item-actor-keyboard-bg',
      hoverBg: 'attr-item-actor-hover-bg',
      text: 'attr-item-actor-text',
    },
    action: {
      selectedBg: 'attr-item-action-selected-bg',
      keyboardBg: 'attr-item-action-keyboard-bg',
      hoverBg: 'attr-item-action-hover-bg',
      text: 'attr-item-action-text',
    },
    thing: {
      selectedBg: 'attr-item-thing-selected-bg',
      keyboardBg: 'attr-item-thing-keyboard-bg',
      hoverBg: 'attr-item-thing-hover-bg',
      text: 'attr-item-thing-text',
    },
    channel: {
      selectedBg: 'attr-item-channel-selected-bg',
      keyboardBg: 'attr-item-channel-keyboard-bg',
      hoverBg: 'attr-item-channel-hover-bg',
      text: 'attr-item-channel-text',
    },
    system: {
      selectedBg: 'attr-item-system-selected-bg',
      keyboardBg: 'attr-item-system-keyboard-bg',
      hoverBg: 'attr-item-system-hover-bg',
      text: 'attr-item-system-text',
    },
    place: {
      selectedBg: 'attr-item-place-selected-bg',
      keyboardBg: 'attr-item-place-keyboard-bg',
      hoverBg: 'attr-item-place-hover-bg',
      text: 'attr-item-place-text',
    },
    word: {
      selectedBg: 'attr-item-word-selected-bg',
      keyboardBg: 'attr-item-word-keyboard-bg',
      hoverBg: 'attr-item-word-hover-bg',
      text: 'attr-item-word-text',
      selectedText: 'attr-item-word-selected-text',
    },
  };

  return (
    classMap[typeKey] || {
      selectedBg: 'attr-item-default-selected-bg',
      keyboardBg: 'attr-item-default-keyboard-bg',
      hoverBg: 'attr-item-default-hover-bg',
      text: 'attr-item-default-text',
    }
  );
}

interface AttributeListItemProps {
  attribute: Attribute;
  isSelected?: boolean;
  isKeyboardSelected?: boolean;
  onSelect: () => void;
}

export const AttributeListItem = React.memo(
  React.forwardRef<HTMLDivElement, AttributeListItemProps>(
    function AttributeListItem(
      { attribute, isSelected = false, isKeyboardSelected = false, onSelect },
      ref
    ) {
      const typeKey = (attribute.type || '').toLowerCase();
      const typeInfo = getAttributeTypeInfo(typeKey);
      const styleClasses = getListItemStyleClasses(typeKey);
      const Icon = typeInfo.icon;
      const [hovered, setHovered] = useState(false);

      // Determine background & text classes based on state
      let bgClass = 'attr-item-bg-transparent';
      let textClass = 'attr-item-text-default';
      let iconColor = typeInfo.colorHex;

      if (isSelected) {
        bgClass = styleClasses.selectedBg;
        textClass = styleClasses.selectedText || 'attr-item-text-selected';
        iconColor = '#FFFFFF';
      } else if (isKeyboardSelected) {
        bgClass = styleClasses.keyboardBg;
        textClass = styleClasses.text;
      } else if (hovered) {
        bgClass = styleClasses.hoverBg;
        textClass = styleClasses.text;
      }

      return (
        <div
          ref={ref}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`attr-item ${bgClass} ${textClass}`}
        >
          {Icon && (
            <Icon
              size={12}
              weight="regular"
              color={iconColor}
              className="attr-item-icon"
            />
          )}
          <span className="attr-item-text-label" title={attribute.name}>
            {attribute.name}
          </span>
        </div>
      );
    }
  )
);

