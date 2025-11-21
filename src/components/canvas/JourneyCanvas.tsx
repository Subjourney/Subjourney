/**
 * Journey Canvas Component
 * Main React Flow canvas for rendering journeys with Dagre layout
 */

import { useCallback, useEffect, useMemo, memo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { applyDagreLayout } from './layout';
import { JourneyNode } from './JourneyNode';
import { PortalNode } from './PortalNode';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import type { Journey } from '../../types';

const nodeTypes = {
  'journey-node': memo(JourneyNode),
  'portal-node': memo(PortalNode),
  'journey-overview-node': memo(JourneyOverviewNode),
};

const proOptions = { hideAttribution: true };

/**
 * Inner canvas component that uses React Flow hooks
 */
function JourneyCanvasInner({ 
  journeyId, 
  backgroundDotColor 
}: { 
  journeyId: string;
  backgroundDotColor?: string;
}) {
  const { currentJourney, setCurrentJourney } = useAppStore();
  const { clearSelection } = useSelection();
  const { fitView } = useReactFlow();
  const [parentJourney, setParentJourney] = useState<Journey | null>(null);
  const navigate = useNavigate();
  const { teamSlug, projectId } = useParams<{
    teamSlug: string;
    projectId: string;
  }>();

  // Get default background dot color from CSS variable
  const defaultDotColor = useMemo(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const computedColor = getComputedStyle(root).getPropertyValue('--canvas-dot-color').trim();
      return computedColor || 'rgba(255, 255, 255, 0.15)';
    }
    return 'rgba(255, 255, 255, 0.15)';
  }, []);

  // Load journey on mount
  useEffect(() => {
    if (journeyId) {
      journeysApi
        .getJourney(journeyId, true)
        .then(async (journey) => {
          setCurrentJourney(journey);
          
          // If this is a subjourney, fetch the parent journey
          if (journey.is_subjourney && journey.parent_step_id) {
            try {
              // Fetch step to get phase_id using Supabase
              const { data: step, error: stepError } = await supabase
                .from('steps')
                .select('phase_id')
                .eq('id', journey.parent_step_id)
                .single();
              
              if (stepError || !step) {
                throw stepError || new Error('Step not found');
              }
              
              // Fetch phase to get journey_id
              const { data: phase, error: phaseError } = await supabase
                .from('phases')
                .select('journey_id')
                .eq('id', step.phase_id)
                .single();
              
              if (phaseError || !phase) {
                throw phaseError || new Error('Phase not found');
              }
              
              // Fetch parent journey
              const parent = await journeysApi.getJourney(phase.journey_id, false);
              setParentJourney(parent);
            } catch (error) {
              console.error('Failed to load parent journey:', error);
              setParentJourney(null);
            }
          } else {
            setParentJourney(null);
          }
        })
        .catch((error) => {
          console.error('Failed to load journey:', error);
        });
    } else {
      // Clear journey if no journeyId
      setCurrentJourney(null);
      setParentJourney(null);
    }

    // Cleanup: Clear journey when component unmounts
    return () => {
      setCurrentJourney(null);
      setParentJourney(null);
    };
  }, [journeyId, setCurrentJourney]);

  // Convert journey data to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!currentJourney) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // If viewing a subjourney, create journey overview node for parent journey
    if (currentJourney.is_subjourney && parentJourney) {
      // Prepare phases and steps for JourneyOverviewNode
      const parentPhases = parentJourney.allPhases || [];
      const parentSteps = parentJourney.allSteps || [];

      flowNodes.push({
        id: `parent-${parentJourney.id}`,
        type: 'journey-overview-node',
        data: {
          journey: parentJourney,
          phases: parentPhases,
          steps: parentSteps,
          onJourneyClick: () => {
            if (teamSlug && projectId) {
              navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}`);
            }
          },
        },
        position: { x: 0, y: 0 }, // Will be positioned by Dagre
        width: 300, // Default width, will be measured
        height: 250, // Default height, will be measured
      });

      // Create edge from parent journey overview to current journey's top handle
      // Use the bottom handle of the parent journey overview node
      flowEdges.push({
        id: `edge-parent-${parentJourney.id}-${currentJourney.id}`,
        source: `parent-${parentJourney.id}`,
        sourceHandle: `journey-${parentJourney.id}-bottom-subjourney`, // Bottom handle available for all overview nodes
        target: currentJourney.id,
        targetHandle: 'parent-top',
        type: 'default',
        style: {
          strokeWidth: 2,
        },
      });
    }

    // Create node for main journey
    flowNodes.push({
      id: currentJourney.id,
      type: 'journey-node',
      data: { journey: currentJourney },
      position: { x: 0, y: 0 }, // Will be positioned by Dagre
    });

    // Create nodes for subjourneys (as journey overview nodes)
    if (currentJourney.subjourneys) {
      currentJourney.subjourneys.forEach((subjourney) => {
        // Prepare phases and steps for JourneyOverviewNode
        const subjourneyPhases = subjourney.allPhases || [];
        const subjourneySteps = subjourney.allSteps || [];

        flowNodes.push({
          id: subjourney.id,
          type: 'journey-overview-node',
          data: {
            journey: subjourney,
            phases: subjourneyPhases,
            steps: subjourneySteps,
            onJourneyClick: () => {
              if (teamSlug && projectId) {
                navigate(`/${teamSlug}/project/${projectId}/journey/${subjourney.id}`);
              }
            },
          },
          position: { x: 0, y: 0 }, // Will be positioned by Dagre
          width: 300, // Default width, will be measured
          height: 250, // Default height, will be measured
        });

        // Create edge from parent step to subjourney
        // The edge connects from the step handle (inside the journey node) to the subjourney's top handle
        if (subjourney.parent_step_id) {
          flowEdges.push({
            id: `edge-${subjourney.parent_step_id}-${subjourney.id}`,
            source: currentJourney.id,
            sourceHandle: `step-${subjourney.parent_step_id}`,
            target: subjourney.id,
            targetHandle: `journey-${subjourney.id}-top-subjourney`, // Top handle for subjourney connections in journey canvas
            type: 'default',
            style: {
              strokeWidth: 2,
            },
          });
        }
      });
    }

    // Apply Dagre layout
    const layouted = applyDagreLayout(flowNodes, flowEdges);
    return layouted;
  }, [currentJourney, parentJourney]);

  // Fit view after JourneyNode mounts and measured size is available (only fit to JourneyNode, not PortalNodes)
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Find the JourneyNode (there's only ever one)
    const journeyNode = nodes.find((n) => n.type === 'journey-node');
    if (!journeyNode) return;

    let rafId = 0;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~12 frames (~200ms) fallback

    const tryFit = () => {
      if (cancelled) return;
      attempts += 1;

      // Only check the JourneyNode measurement (not PortalNodes)
      const journeyEl = document.querySelector(`[data-journey-node="true"][data-journey-id="${journeyNode.id}"]`) as HTMLElement;
      const isMeasured =
        !journeyEl ||
        (() => {
          const w = parseInt(journeyEl.getAttribute('data-width') || '0', 10);
          const h = parseInt(journeyEl.getAttribute('data-height') || '0', 10);
          return w > 0 && h > 0;
        })();

      if (isMeasured || attempts >= maxAttempts) {
        // Only fit to the JourneyNode, exclude PortalNodes
        fitView({ 
          padding: 0.25, 
          includeHiddenNodes: true,
          nodes: [journeyNode] // Only fit to the JourneyNode
        });
        return;
      }
      rafId = requestAnimationFrame(tryFit);
    };

    rafId = requestAnimationFrame(tryFit);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [nodes, fitView]);


  const onNodesChange = useCallback((changes: unknown[]) => {
    // Handle node changes (position updates, etc.)
    console.log('Nodes changed:', changes);
  }, []);

  const onEdgesChange = useCallback((changes: unknown[]) => {
    // Handle edge changes
    console.log('Edges changed:', changes);
  }, []);

  // Clear selection when clicking on canvas background
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  if (!currentJourney) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div>Loading journey...</div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.25, includeHiddenNodes: true }}
      proOptions={proOptions}
      attributionPosition="bottom-left"
      elevateEdgesOnSelect={true}
      elevateNodesOnSelect={false}
      minZoom={0.1}
      maxZoom={1}
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={false}
    >
      <Background color={backgroundDotColor || defaultDotColor} />
      <Controls />
    </ReactFlow>
  );
}

/**
 * Journey Canvas - Main canvas component with React Flow provider
 */
export function JourneyCanvas({ 
  journeyId, 
  backgroundDotColor 
}: { 
  journeyId: string;
  backgroundDotColor?: string;
}) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100vh' }}>
        <JourneyCanvasInner journeyId={journeyId} backgroundDotColor={backgroundDotColor} />
      </div>
    </ReactFlowProvider>
  );
}

