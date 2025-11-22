/**
 * TextAreaWithLabel Component
 * Textarea field with label, using CSS variables for styling
 * Based on InputWithLabel with same focus styles
 */

import React from 'react';

export interface TextAreaWithLabelProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text for the textarea */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Character count to display (optional) */
  characterCount?: number;
  /** Maximum character count */
  maxLength?: number;
}

export const TextAreaWithLabel = React.forwardRef<HTMLTextAreaElement, TextAreaWithLabelProps>(
  function TextAreaWithLabel(
    {
      label,
      error,
      characterCount,
      maxLength,
      id,
      className = '',
      ...props
    },
    ref
  ) {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

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

    const textareaWrapperStyle: React.CSSProperties = {
      position: 'relative',
    };

    const baseTextareaStyle: React.CSSProperties = {
      appearance: 'none',
      display: 'block',
      width: '100%',
      padding: 'var(--spacing-md)',
      borderWidth: 'var(--border-width-sm)',
      borderStyle: 'var(--border-style)',
      borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--surface-2)',
      color: 'var(--color-text-primary)',
      fontSize: 'var(--font-size-base)',
      fontFamily: 'inherit',
      outline: 'none',
      resize: 'vertical',
    };

    const textareaFocusStyle: React.CSSProperties = {
      borderColor: 'var(--color-primary)',
    };

    const errorStyle: React.CSSProperties = {
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-error)',
    };

    const characterCountStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 'var(--spacing-xs)',
      right: 'var(--spacing-xs)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)',
      pointerEvents: 'none',
    };

    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div style={containerStyle}>
        {label && (
          <label htmlFor={textareaId} style={labelStyle}>
            {label}
          </label>
        )}
        <div style={textareaWrapperStyle}>
          <textarea
            ref={ref}
            id={textareaId}
            maxLength={maxLength}
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
              ...baseTextareaStyle,
              ...(isFocused ? textareaFocusStyle : {}),
            }}
            className={className}
          />
          {/* Character count */}
          {maxLength && characterCount !== undefined && (
            <div style={characterCountStyle}>
              {characterCount} / {maxLength}
            </div>
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
  }
);

