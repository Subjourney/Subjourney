/**
 * InputWithLabel Component
 * Input field with label, using CSS variables for styling
 */

import React from 'react';
import type { Icon } from '@phosphor-icons/react';

export interface InputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text for the input */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Optional icon to display */
  icon?: Icon;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Show password toggle (for password inputs) */
  showPasswordToggle?: boolean;
  /** Password visibility state */
  showPassword?: boolean;
  /** Toggle password visibility handler */
  onTogglePassword?: () => void;
}

export const InputWithLabel = React.forwardRef<HTMLInputElement, InputWithLabelProps>(
  function InputWithLabel(
    {
      label,
      error,
      icon: Icon,
      iconPosition = 'left',
      showPasswordToggle = false,
      showPassword = false,
      onTogglePassword,
      id,
      className = '',
      ...props
    },
    ref
  ) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-primary)',
    textAlign: 'left',
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
  };

  const baseInputStyle: React.CSSProperties = {
    appearance: 'none',
    display: 'block',
    width: '100%',
    paddingLeft: Icon && iconPosition === 'left' ? 'var(--spacing-xl)' : 'var(--spacing-md)',
    paddingRight: showPasswordToggle ? 'var(--spacing-xl)' : 'var(--spacing-md)',
    paddingTop: 'var(--spacing-md)',
    paddingBottom: 'var(--spacing-md)',
    borderWidth: 'var(--border-width-sm)',
    borderStyle: 'var(--border-style)',
    borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: 'var(--color-primary)',
  };

  const iconContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    ...(iconPosition === 'left' ? { left: 'var(--spacing-md)' } : { right: 'var(--spacing-md)' }),
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-error)',
  };

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <div style={inputWrapperStyle}>
        {Icon && iconPosition === 'left' && (
          <div style={iconContainerStyle}>
            <Icon size={18} weight="regular" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            ...baseInputStyle,
            ...(isFocused ? inputFocusStyle : {}),
          }}
          className={className}
        />
        {Icon && iconPosition === 'right' && (
          <div style={iconContainerStyle}>
            <Icon size={18} weight="regular" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        )}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            style={{
              position: 'absolute',
              top: '50%',
              right: 'var(--spacing-md)',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--color-text-secondary)',
            }}
          >
            {showPassword ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
        {/* Focus outline */}
        {isFocused && (
          <div
            style={{
              position: 'absolute',
              inset: '-3px',
              borderRadius: 'var(--radius-lg)',
              border: '3px solid rgba(33, 150, 243, 0.3)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
});

