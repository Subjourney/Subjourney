import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { projectsApi, teamsApi } from '../api';
import type { Project, Team } from '../types';

/**
 * Team Dashboard Page
 * Displays projects for a specific team
 * Route: /:teamSlug/dashboard
 */
export function TeamPage() {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load team and projects
  useEffect(() => {
    if (!teamSlug) {
      setError('Team slug is required');
      setLoading(false);
      return;
    }

    // TODO: Load team and projects from API when backend is ready
    // For now, load from Supabase directly
    const loadData = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        
        // Get team by slug
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('slug', teamSlug)
          .single();

        if (teamError || !teamData) {
          setError('Team not found');
          setLoading(false);
          return;
        }

        setTeam(teamData);

        // Get projects for this team
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false });

        if (projectsError) {
          setError(projectsError.message);
        } else {
          setProjects(projectsData || []);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    };

    loadData();
  }, [teamSlug]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/${teamSlug}/project/${projectId}`);
  };

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading team...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{error}</div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--spacing-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-lg)', margin: 0 }}>
          {team?.name || teamSlug}
        </h1>
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

      {/* Main Content */}
      <div style={{ flex: 1, padding: 'var(--spacing-lg)', overflow: 'auto' }}>
        {projects.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 'var(--spacing-md)',
            }}
          >
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
              No projects yet
            </div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
              Create a project to get started
            </div>
            {/* TODO: Add create project button when API is ready */}
          </div>
        ) : (
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-md)' }}>
              Projects
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 'var(--spacing-md)',
              }}
            >
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  <h3 style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)', margin: '0 0 var(--spacing-sm) 0' }}>
                    {project.name}
                  </h3>
                  {project.description && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

