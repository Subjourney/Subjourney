/**
 * Journey Title Component
 */

import type { Journey } from '../../types';

interface JourneyTitleProps {
  journey: Journey;
}

export function JourneyTitle({ journey }: JourneyTitleProps) {
  return (
    <div className="journey-title" style={{ marginBottom: 'var(--spacing-md)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
        {journey.name}
      </h2>
      {journey.description && (
        <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
          {journey.description}
        </p>
      )}
    </div>
  );
}

