import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JourneyCanvas } from '../components/canvas';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { journeysApi } from '../api';
import { useAppStore } from '../store';
import type { Journey } from '../types';

/**
 * Journey Page
 * Displays the journey canvas for a specific journey
 * Route: /:teamSlug/project/:projectId/journey/:journeyId
 */
export function JourneyPage() {
  const { teamSlug, projectId, journeyId } = useParams<{
    teamSlug: string;
    projectId: string;
    journeyId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentJourney } = useAppStore();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load journey data
  useEffect(() => {
    if (!journeyId) {
      setError('Journey ID is required');
      setLoading(false);
      return;
    }

    journeysApi
      .getJourney(journeyId, true)
      .then((journeyData) => {
        setJourney(journeyData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load journey');
    setLoading(false);
      });

    // Cleanup: Clear journey state when navigating away
    return () => {
      setCurrentJourney(null);
      setJourney(null);
    };
  }, [journeyId, setCurrentJourney]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading journey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{error}</div>
        <button
          onClick={() => navigate(teamSlug && projectId ? `/${teamSlug}/project/${projectId}` : '/')}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Go to Project
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Header with journey info and sign out - floating above canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: 'var(--spacing-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => navigate(teamSlug && projectId ? `/${teamSlug}/project/${projectId}` : '/')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            ← Back to Project
          </button>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
            {journey?.name || `Journey ${journeyId}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Journey Canvas - full viewport, header floats above */}
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <JourneyCanvas journeyId={journeyId || ''} />
      </div>
    </div>
  );
}

