import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, SignOut, DotsThree, Trash } from '@phosphor-icons/react';
import { JourneyCanvas } from '../components/canvas';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { journeysApi } from '../api';
import { useAppStore } from '../store';
import { useSelection } from '../store/hooks';
import type { Journey } from '../types';
import { Button, DropMenu, MenuListItem, DialogConfirm } from '../components/ui';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  
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

  const handleDeleteJourney = () => {
    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!journeyId || !journey) return;

    try {
      await journeysApi.deleteJourney(journeyId);
      // Navigate to project page after successful deletion
      navigate(teamSlug && projectId ? `/${teamSlug}/project/${projectId}` : '/');
    } catch (error) {
      console.error('Error deleting journey:', error);
      setDeleteConfirmOpen(false);
      // TODO: Show error message to user
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
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
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', pointerEvents: 'auto' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', pointerEvents: 'auto' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {user?.email}
          </div>
          <Button
            ref={menuButtonRef}
            icon={DotsThree}
            iconOnly
            iconWeight="bold"
            variant="secondary"
            size="md"
            onClick={() => setMenuOpen(!menuOpen)}
          />
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
        <DropMenu
          anchorRef={menuButtonRef}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        >
          <MenuListItem
            icon={Trash}
            iconPosition="left"
            variant="danger"
            onClick={handleDeleteJourney}
            fullWidth
          >
            Delete Journey
          </MenuListItem>
        </DropMenu>
      </div>

      {/* Journey Canvas - full viewport, header floats above */}
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <JourneyCanvas journeyId={journeyId || ''} initialTarget={initialTarget || undefined} />
      </div>

      {/* Delete Journey Confirmation Dialog */}
      <DialogConfirm
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Journey?"
        message={`Are you sure you want to delete "${journey?.name || 'this journey'}"? This will permanently delete the journey and all of its data, including phases, steps, and all related content. This action cannot be undone.`}
        confirmLabel="Delete Journey"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}

