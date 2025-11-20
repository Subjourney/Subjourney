import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectCanvas } from '../components/canvas';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
// Note: Using direct Supabase queries for now
import type { Project, Journey, Phase, Step } from '../types';

/**
 * Project Page
 * Displays the project canvas with journey nodes
 * Route: /:teamSlug/project/:projectId
 * 
 * Loads all journeys for the project and displays them in a project container node.
 * For now, uses mock data until backend is ready.
 */
export function ProjectPage() {
  const { teamSlug, projectId } = useParams<{ teamSlug: string; projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeyPhases, setJourneyPhases] = useState<Record<string, Phase[]>>({});
  const [phaseSteps, setPhaseSteps] = useState<Record<string, Step[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data and journeys
  useEffect(() => {
    if (!projectId) {
      setError('Project ID is required');
      setLoading(false);
      return;
    }

    // Load project and journeys from Supabase
    const loadData = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        
        // Get project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError || !projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProject(projectData);

        // Get journeys for this project (include subjourneys for edge connections)
        const { data: journeysData, error: journeysError } = await supabase
          .from('journeys')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (journeysError) {
          setError(journeysError.message);
          setLoading(false);
          return;
        }

        const allJourneys = journeysData || [];
        setJourneys(allJourneys);

        // Load phases and steps for each journey
        const phasesMap: Record<string, Phase[]> = {};
        const stepsMap: Record<string, Step[]> = {};

        for (const journey of allJourneys) {
          // Load phases for this journey
          const { data: phasesData } = await supabase
            .from('phases')
            .select('*')
            .eq('journey_id', journey.id)
            .order('sequence_order', { ascending: true });

          if (phasesData) {
            phasesMap[journey.id] = phasesData;

            // Load steps for all phases in this journey
            const phaseIds = phasesData.map((p) => p.id);
            if (phaseIds.length > 0) {
              const { data: stepsData } = await supabase
                .from('steps')
                .select('*')
                .in('phase_id', phaseIds)
                .order('sequence_order', { ascending: true });

              if (stepsData) {
                // Group steps by phase_id
                stepsData.forEach((step) => {
                  if (!stepsMap[step.phase_id]) {
                    stepsMap[step.phase_id] = [];
                  }
                  stepsMap[step.phase_id].push(step);
                });
              }
            }
          } else {
            phasesMap[journey.id] = [];
          }
        }

        setJourneyPhases(phasesMap);
        setPhaseSteps(stepsMap);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{error}</div>
        <button
          onClick={() => navigate(teamSlug ? `/${teamSlug}/dashboard` : '/')}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Default project if not loaded
  const displayProject: Project = project || {
    id: projectId || '',
    team_id: '',
    name: `Project ${projectId}`,
    description: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleJourneyClick = (journeyId: string) => {
    navigate(`/${teamSlug}/project/${projectId}/journey/${journeyId}`);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Header with project info and sign out - floating above canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--spacing-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => navigate(teamSlug ? `/${teamSlug}/dashboard` : '/')}
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
            ← Back
          </button>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
            {displayProject.name}
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

      {/* Canvas - full viewport, header floats above */}
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <ProjectCanvas
          project={displayProject}
          journeys={journeys}
          journeyPhases={journeyPhases}
          phaseSteps={phaseSteps}
          teamSlug={teamSlug || ''}
          onJourneyClick={handleJourneyClick}
        />
      </div>
    </div>
  );
}

