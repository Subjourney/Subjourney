/**
 * MenuListItem Component
 * Menu item component with button-like variants, states, and icon support
 */

import React, { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import type { ButtonVariant, ButtonState, IconWeight } from './Button';

export interface MenuListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Menu item text label */
  children?: ReactNode;
  /** Optional icon component from @phosphor-icons/react */
  icon?: Icon;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Icon weight (Phosphor icon weight) */
  iconWeight?: IconWeight;
  /** Menu item variant/style */
  variant?: ButtonVariant;
  /** Menu item state */
  state?: ButtonState;
  /** Full width menu item */
  fullWidth?: boolean;
  /** Show border separator below this item */
  showBorder?: boolean;
}

export function MenuListItem({
  children,
  icon: Icon,
  iconPosition = 'left',
  iconWeight = 'regular',
  variant = 'ghost',
  state = 'default',
  fullWidth = false,
  showBorder = false,
  disabled,
  ...props
}: MenuListItemProps) {
  const isDisabled = disabled || state === 'disabled' || state === 'loading';
  const [isHovered, setIsHovered] = React.useState(false);

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: '#ffffff',
      borderWidth: 0,
      borderStyle: 'none',
    },
    secondary: {
      backgroundColor: 'var(--surface-2)',
      color: 'var(--color-text-primary)',
      borderWidth: 0,
      borderStyle: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-primary)',
      borderWidth: 0,
      borderStyle: 'none',
    },
    danger: {
      backgroundColor: 'transparent',
      color: 'var(--color-error)',
      borderWidth: 0,
      borderStyle: 'none',
    },
  };

  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary-hover)',
    },
    secondary: {
      backgroundColor: 'var(--surface-3)',
    },
    ghost: {
      backgroundColor: 'var(--surface-3)',
    },
    danger: {
      backgroundColor: 'var(--surface-3)',
      color: 'var(--color-error)',
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: fullWidth ? '100%' : 'auto',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    gap: 'var(--spacing-sm)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    borderRadius: 'var(--radius-sm)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    borderWidth: 0,
    borderStyle: 'none',
    outline: 'none',
    transition: 'background-color 0.15s ease',
    ...variantStyles[variant],
    ...(isHovered && !isDisabled && state === 'default' ? hoverStyles[variant] : {}),
    ...(state === 'active' ? hoverStyles[variant] : {}),
  };

  const containerStyle: React.CSSProperties = {
    borderBottomWidth: showBorder ? 'var(--border-width-sm)' : 0,
    borderBottomStyle: showBorder ? 'var(--border-style)' : 'none',
    borderBottomColor: showBorder ? 'var(--color-border)' : 'transparent',
    paddingBottom: showBorder ? 'var(--spacing-xs)' : 0,
    marginBottom: showBorder ? 'var(--spacing-xs)' : 0,
  };

  const iconSize = 18;

  return (
    <div style={containerStyle}>
      <button
        {...props}
        disabled={isDisabled}
        style={baseStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {Icon && iconPosition === 'left' && (
          <Icon size={iconSize} weight={iconWeight} style={{ flexShrink: 0 }} />
        )}
        {children && <span style={{ flex: 1, textAlign: 'left' }}>{children}</span>}
        {Icon && iconPosition === 'right' && (
          <Icon size={iconSize} weight={iconWeight} style={{ flexShrink: 0 }} />
        )}
        {state === 'loading' && (
          <div
            style={{
              width: iconSize,
              height: iconSize,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              marginLeft: iconPosition === 'right' ? 0 : 'var(--spacing-xs)',
              marginRight: iconPosition === 'left' ? 0 : 'var(--spacing-xs)',
            }}
          />
        )}
      </button>
    </div>
  );
}

