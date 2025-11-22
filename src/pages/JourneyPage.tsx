import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, SignOut } from '@phosphor-icons/react';
import { JourneyCanvas } from '../components/canvas';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { journeysApi } from '../api';
import { useAppStore } from '../store';
import { useSelection } from '../store/hooks';
import type { Journey } from '../types';
import { Button } from '../components/ui';

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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { setCurrentJourney } = useAppStore();
  const { select } = useSelection();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Handle phase/step selection from URL params
  useEffect(() => {
    const phaseId = searchParams.get('phase');
    const stepId = searchParams.get('step');
    
    if (phaseId) {
      select('selectedPhase', phaseId);
    } else if (stepId) {
      select('selectedStep', stepId);
    }
  }, [searchParams, select]);

  // Initial selection intent for JourneyCanvas to perform custom zoom
  const initialTarget = useMemo(() => {
    const phaseId = searchParams.get('phase');
    const stepId = searchParams.get('step');
    if (stepId) return { type: 'step' as const, id: stepId };
    if (phaseId) return { type: 'phase' as const, id: phaseId };
    return null;
  }, [searchParams]);

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
        <Button
          variant="secondary"
          onClick={() => navigate(teamSlug && projectId ? `/${teamSlug}/project/${projectId}` : '/')}
        >
          Go to Project
        </Button>
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
          <Button
            icon={ArrowLeft}
            iconPosition="left"
            variant="secondary"
            size="md"
            onClick={() => navigate(teamSlug && projectId ? `/${teamSlug}/project/${projectId}` : '/')}
          >
            Back to Project
          </Button>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
            {journey?.name || `Journey ${journeyId}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {user?.email}
          </div>
          <Button
            icon={SignOut}
            iconPosition="left"
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Journey Canvas - full viewport, header floats above */}
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <JourneyCanvas journeyId={journeyId || ''} initialTarget={initialTarget || undefined} />
      </div>
    </div>
  );
}

