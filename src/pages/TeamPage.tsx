import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import type { Project, Team } from '../types';
import { Button, DialogProject } from '../components/ui';
import { projectsApi } from '../api';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

        // Get projects for this team using API
        try {
          const projectsData = await projectsApi.getTeamProjects(teamData.id);
          setProjects(projectsData || []);
        } catch (err) {
          console.error('Failed to load projects:', err);
          // Fallback to Supabase if API fails
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

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleProjectCreated = async (_project: Project) => {
    // Reload projects list
    if (team) {
      try {
        const projectsData = await projectsApi.getTeamProjects(team.id);
        setProjects(projectsData || []);
      } catch (err) {
        console.error('Failed to reload projects:', err);
        // Fallback to Supabase if API fails
        try {
          const { supabase } = await import('../lib/supabase');
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: false });

          if (!projectsError && projectsData) {
            setProjects(projectsData);
          }
        } catch (fallbackErr) {
          console.error('Failed to reload projects (fallback):', fallbackErr);
        }
      }
    }
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
        <Button
          variant="secondary"
          onClick={() => navigate('/')}
        >
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
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
        {/* Team Switcher Placeholder */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {/* Placeholder for team switcher */}
          <div
            style={{
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              background: 'var(--surface-2)',
              border: '1px dashed var(--color-border-1)',
              borderRadius: 'var(--radius-md)',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            Team Switcher
          </div>
        </div>

        {/* Project Button */}
        <Button icon={Plus} iconPosition="left" variant="primary" size="md" onClick={handleOpenDialog}>
          Project
        </Button>
      </div>

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
          <Button
            icon={SignOut}
            iconPosition="left"
            variant="secondary"
            size="md"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
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
                    background: 'var(--surface-2)',
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

      {/* Project Dialog */}
      {team && (
        <DialogProject
          open={isDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleProjectCreated}
          teamId={team.id}
        />
      )}
    </div>
  );
}

