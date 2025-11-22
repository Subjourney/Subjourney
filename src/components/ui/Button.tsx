/**
 * Button Component
 * Flexible button component with support for states, icons, sizes, and variants
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonState = 'default' | 'hover' | 'active' | 'disabled' | 'loading';
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
export type FocusRing = 'none' | 'default';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button text label (optional for icon-only buttons) */
  children?: ReactNode;
  /** Optional icon component from @phosphor-icons/react */
  icon?: Icon;
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right';
  /** Optional end icon (right side) - enables two-icon mode */
  endIcon?: Icon;
  /** Icon weight (Phosphor icon weight) */
  iconWeight?: IconWeight;
  /** End icon weight (Phosphor icon weight) */
  endIconWeight?: IconWeight;
  /** Push icon all the way to the right edge */
  iconPushRight?: boolean;
  /** Label alignment */
  labelAlign?: 'left' | 'center';
  /** Button size */
  size?: ButtonSize;
  /** Button variant/style */
  variant?: ButtonVariant;
  /** Button state */
  state?: ButtonState;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon-only button (square, no padding for text) */
  iconOnly?: boolean;
  /** Focus ring style */
  focusRing?: FocusRing;
  /** Border radius (CSS value, e.g., '4px', 'var(--radius-md)', '50%') */
  borderRadius?: string;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontSize: 'var(--font-size-sm)',
    gap: 'var(--spacing-xs)',
    height: '28px',
    minWidth: '28px',
  },
  md: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-size-base)',
    gap: 'var(--spacing-sm)',
    height: '36px',
    minWidth: '36px',
  },
  lg: {
    paddingTop: 'var(--spacing-md)',
    paddingBottom: 'var(--spacing-md)',
    paddingLeft: '12px',
    paddingRight: '12px',
    fontSize: 'var(--font-size-md)',
    gap: 'var(--spacing-sm)',
    height: '44px',
    minWidth: '44px',
  },
};

const iconOnlySizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: 'var(--spacing-xs)',
    width: '28px',
    height: '28px',
  },
  md: {
    padding: 'var(--spacing-sm)',
    width: '36px',
    height: '36px',
  },
  lg: {
    padding: 'var(--spacing-md)',
    width: '44px',
    height: '44px',
  },
};

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
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: 'var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    borderWidth: 0,
    borderStyle: 'none',
  },
  danger: {
    backgroundColor: 'var(--color-error)',
    color: '#ffffff',
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
    borderColor: 'var(--color-border-1)',
  },
  ghost: {
    backgroundColor: 'var(--surface-4)',
  },
  danger: {
    backgroundColor: '#dc2626',
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    icon: Icon,
    iconPosition = 'left',
    endIcon: EndIcon,
    iconWeight = 'regular',
    endIconWeight = 'regular',
    iconPushRight = false,
    labelAlign = 'center',
    size = 'md',
    variant = 'primary',
    state = 'default',
    fullWidth = false,
    iconOnly = false,
    focusRing = 'none',
    borderRadius = 'var(--radius-md)',
    disabled,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const isDisabled = disabled || state === 'disabled' || state === 'loading';
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  
  // Determine if this is an icon-only button
  const isIconOnly = iconOnly || (!children && Icon);

  const focusRingStyle: React.CSSProperties =
    focusRing === 'default' && isFocused
      ? {
          outline: '2px solid var(--color-primary)',
          outlineOffset: '2px',
        }
      : {
          outline: 'none',
        };

  // Determine if we have two icons
  const hasTwoIcons = Icon && EndIcon;
  // Determine label alignment style
  const labelAlignStyle: React.CSSProperties = 
    iconPushRight && iconPosition === 'right'
      ? { flex: 1, textAlign: labelAlign === 'left' ? 'left' : 'center' }
      : labelAlign === 'left' && hasTwoIcons
        ? { flex: 1, textAlign: 'left' }
        : labelAlign === 'left'
          ? { flex: 1, textAlign: 'left' }
          : {};

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: iconPushRight && iconPosition === 'right' ? 'space-between' : 'center',
    borderRadius,
    fontWeight: 'var(--font-weight-medium)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : isIconOnly ? iconOnlySizeStyles[size].width : 'auto',
    ...(isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size]),
    ...variantStyles[variant],
    ...(isHovered && !isDisabled && state === 'default' ? hoverStyles[variant] : {}),
    ...(state === 'active' ? hoverStyles[variant] : {}),
    ...focusRingStyle,
  };

  const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : 20;
  const isLoading = state === 'loading';

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Determine spinner position based on button configuration
  const getSpinnerPosition = (): React.CSSProperties => {
    if (isIconOnly) {
      // Icon-only: spinner is centered (no margins needed)
      return {};
    }
    
    if (hasTwoIcons) {
      // Two icons: spinner replaces left icon
      return { marginRight: 'var(--spacing-xs)' };
    }
    
    if (iconPosition === 'right') {
      // Right icon: spinner replaces right icon
      return { marginLeft: 'var(--spacing-xs)' };
    }
    
    // Left icon or no icon: spinner on left
    return { marginRight: 'var(--spacing-xs)' };
  };

  return (
    <button
      ref={ref}
      {...props}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Loading spinner - replaces icons when loading */}
      {isLoading ? (
        <div
          style={{
            width: iconSize,
            height: iconSize,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            flexShrink: 0,
            ...getSpinnerPosition(),
          }}
        />
      ) : (
        <>
          {/* Left icon (or single icon when iconPosition is left) */}
          {Icon && (isIconOnly || iconPosition === 'left' || hasTwoIcons) && (
            <Icon size={iconSize} weight={iconWeight} style={{ flexShrink: 0 }} />
          )}
          
          {/* Label/children */}
          {children && !isIconOnly && (
            <span style={labelAlignStyle}>{children}</span>
          )}
          
          {/* Right icon - either EndIcon (two-icon mode) or Icon (single icon on right) */}
          {hasTwoIcons && EndIcon && (
            <EndIcon size={iconSize} weight={endIconWeight} style={{ flexShrink: 0 }} />
          )}
          {!hasTwoIcons && Icon && !isIconOnly && iconPosition === 'right' && (
            <Icon size={iconSize} weight={iconWeight} style={{ flexShrink: 0 }} />
          )}
        </>
      )}
    </button>
  );
});

