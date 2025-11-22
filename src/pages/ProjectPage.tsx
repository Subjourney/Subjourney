import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotsThree, PencilSimple, Trash, ArrowLeft, Plus } from '@phosphor-icons/react';
import { ProjectCanvas } from '../components/canvas';
// Note: Using direct Supabase queries for now
import type { Project, Journey, Phase, Step } from '../types';
import { Button, DropMenu, MenuListItem, DialogProject, DialogJourney, DialogConfirm } from '../components/ui';
import { projectsApi, journeysApi } from '../api';

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
  const [project, setProject] = useState<Project | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [journeyPhases, setJourneyPhases] = useState<Record<string, Phase[]>>({});
  const [phaseSteps, setPhaseSteps] = useState<Record<string, Step[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createJourneyDialogOpen, setCreateJourneyDialogOpen] = useState(false);
  const [addJourneyDialogOpen, setAddJourneyDialogOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
        <Button
          variant="secondary"
          onClick={() => navigate(teamSlug ? `/${teamSlug}/dashboard` : '/')}
        >
          Go to Dashboard
        </Button>
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

  const handlePhaseClick = (phaseId: string) => {
    // Find the journey that contains this phase
    const journey = journeys.find(j => {
      const phases = journeyPhases[j.id] || [];
      return phases.some(p => p.id === phaseId);
    });
    
    if (journey) {
      // Navigate to journey canvas with phase selection
      navigate(`/${teamSlug}/project/${projectId}/journey/${journey.id}?phase=${phaseId}`);
    }
  };

  const handleStepClick = (stepId: string) => {
    // Find the journey that contains this step
    const journey = journeys.find(j => {
      const phases = journeyPhases[j.id] || [];
      return phases.some(phase => {
        const steps = phaseSteps[phase.id] || [];
        return steps.some(s => s.id === stepId);
      });
    });
    
    if (journey) {
      // Navigate to journey canvas with step selection
      navigate(`/${teamSlug}/project/${projectId}/journey/${journey.id}?step=${stepId}`);
    }
  };

  const handleImportJourney = () => {
    // TODO: Implement import journey functionality
    console.log('Import journey data');
  };

  const handleCreateJourney = () => {
    setCreateJourneyDialogOpen(true);
  };

  const handleAddJourney = () => {
    setAddJourneyDialogOpen(true);
  };

  const handleJourneyAdded = async (journey: Journey) => {
    setAddJourneyDialogOpen(false);
    // Reload journeys
    if (projectId) {
      try {
        const journeys = await journeysApi.getProjectJourneys(projectId);
        setJourneys(journeys);
        
        // Reload phases and steps for the new journey
        const { supabase } = await import('../lib/supabase');
        const phasesMap: Record<string, Phase[]> = { ...journeyPhases };
        const stepsMap: Record<string, Step[]> = { ...phaseSteps };
        
        // Load phases for the new journey
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
        
        setJourneyPhases(phasesMap);
        setPhaseSteps(stepsMap);
      } catch (err) {
        console.error('Failed to reload journeys:', err);
      }
    }
  };

  const handleJourneyCreated = async (journey: Journey) => {
    setCreateJourneyDialogOpen(false);
    // Reload journeys
    if (projectId) {
      try {
        const journeys = await journeysApi.getProjectJourneys(projectId);
        setJourneys(journeys);
        
        // Reload phases and steps for the new journey
        const { supabase } = await import('../lib/supabase');
        const phasesMap: Record<string, Phase[]> = { ...journeyPhases };
        const stepsMap: Record<string, Step[]> = { ...phaseSteps };
        
        // Load phases for the new journey
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
        
        setJourneyPhases(phasesMap);
        setPhaseSteps(stepsMap);
      } catch (err) {
        console.error('Failed to reload journeys:', err);
      }
    }
  };

  const handleEditProject = () => {
    setMenuOpen(false);
    setEditDialogOpen(true);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProject(updatedProject);
    setEditDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
  };

  const handleDeleteProject = () => {
    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectId || !displayProject) return;

    try {
      await projectsApi.deleteProject(displayProject.id);
      // Navigate to team dashboard after successful deletion
      navigate(teamSlug ? `/${teamSlug}/dashboard` : '/');
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteConfirmOpen(false);
      // TODO: Show error message to user
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
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
            onClick={() => navigate(teamSlug ? `/${teamSlug}/dashboard` : '/')}
          >
            Back
          </Button>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
            {displayProject.name}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {journeys.length > 0 && (
            <Button
              icon={Plus}
              iconPosition="left"
              variant="primary"
              size="md"
              onClick={handleAddJourney}
            >
              Journey
            </Button>
          )}
          <Button
            ref={menuButtonRef}
            icon={DotsThree}
            iconOnly
            iconWeight="bold"
            variant="secondary"
            size="md"
            onClick={() => setMenuOpen(!menuOpen)}
          />
        </div>
        <DropMenu
          anchorRef={menuButtonRef}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        >
          <MenuListItem
            icon={PencilSimple}
            iconPosition="left"
            variant="ghost"
            onClick={handleEditProject}
            fullWidth
            showBorder
          >
            Edit Project
          </MenuListItem>
          <MenuListItem
            icon={Trash}
            iconPosition="left"
            variant="danger"
            onClick={handleDeleteProject}
            fullWidth
          >
            Delete Project
          </MenuListItem>
        </DropMenu>
      </div>

      {/* Edit Project Dialog */}
      {project && (
        <DialogProject
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          onSubmit={handleProjectUpdated}
          projectData={project}
          teamId={project.team_id}
        />
      )}

      {/* Delete Project Confirmation Dialog */}
      <DialogConfirm
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Project?"
        message={`Are you sure you want to delete "${displayProject.name}"? This will permanently delete the project and all of its data, including journeys, phases, steps, and all related content. This action cannot be undone.`}
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        confirmVariant="danger"
      />

      {/* Create Journey Dialog (from ProjectSetupNode) */}
      {projectId && (
        <DialogJourney
          open={createJourneyDialogOpen}
          onClose={() => setCreateJourneyDialogOpen(false)}
          onSubmit={handleJourneyCreated}
          projectId={projectId}
        />
      )}

      {/* Add Journey Dialog (from + Journey button) */}
      {projectId && (
        <DialogJourney
          open={addJourneyDialogOpen}
          onClose={() => setAddJourneyDialogOpen(false)}
          onSubmit={handleJourneyAdded}
          projectId={projectId}
        />
      )}

      {/* Canvas - full viewport, header floats above */}
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <ProjectCanvas
          project={displayProject}
          journeys={journeys}
          journeyPhases={journeyPhases}
          phaseSteps={phaseSteps}
          teamSlug={teamSlug || ''}
          onJourneyClick={handleJourneyClick}
          onPhaseClick={handlePhaseClick}
          onStepClick={handleStepClick}
          onImportJourney={handleImportJourney}
          onCreateJourney={handleCreateJourney}
        />
      </div>
    </div>
  );
}

