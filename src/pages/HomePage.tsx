import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTeam } from '../hooks/useTeam';
import { signOut } from '../lib/auth';
import { projectsApi } from '../api';
import type { Project } from '../types';

/**
 * Home Page
 * Displays user's teams and projects
 * Route: /
 * Redirects to /:teamSlug if user has a team
 */
export function HomePage() {
  const { user } = useAuth();
  const { team, loading: teamLoading } = useTeam();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to team dashboard if team is loaded
  useEffect(() => {
    if (!teamLoading && team?.slug) {
      navigate(`/${team.slug}/dashboard`, { replace: true });
    }
  }, [team, teamLoading, navigate]);

  // Load user's projects
  useEffect(() => {
    // TODO: Load projects from API when backend is ready
    // For now, show empty state
    // projectsApi
    //   .getProjects()
    //   .then((projectsData) => {
    //     setProjects(projectsData);
    //     setLoading(false);
    //   })
    //   .catch((err) => {
    //     setError(err.message || 'Failed to load projects');
    //     setLoading(false);
    //   });

    // For now, just set loading to false
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProjectClick = (projectId: string) => {
    if (team?.slug) {
      navigate(`/${team.slug}/project/${projectId}`);
    }
  };

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
          Subjourney
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
        {teamLoading || loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div>Loading projects...</div>
          </div>
        ) : error ? (
          <div style={{ color: 'var(--color-error)' }}>{error}</div>
        ) : projects.length === 0 ? (
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

