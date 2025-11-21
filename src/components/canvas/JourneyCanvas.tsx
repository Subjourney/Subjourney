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
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { applyDagreLayout } from './layout';
import { JourneyNode } from './JourneyNode';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import type { Journey } from '../../types';

const nodeTypes = {
  'journey-node': memo(JourneyNode),
  'journey-overview-node': memo(JourneyOverviewNode),
};

const edgeTypes = {
  'step-to-subjourney': memo(StepToSubjourneyEdge),
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
      // Filter to show only the parent step and its phase
      const parentPhases = parentJourney.allPhases || [];
      const parentSteps = parentJourney.allSteps || [];
      
      // Find the parent step
      const parentStep = parentSteps.find(step => step.id === currentJourney.parent_step_id);
      
      // Filter phases and steps to only show the parent step and its phase
      let filteredPhases: typeof parentPhases = [];
      let filteredSteps: typeof parentSteps = [];
      let parentPhase: typeof parentPhases[0] | undefined = undefined;
      
      if (parentStep) {
        // Find the phase that contains the parent step
        parentPhase = parentPhases.find(phase => phase.id === parentStep.phase_id);
        
        if (parentPhase) {
          // Only include the parent phase
          filteredPhases = [parentPhase];
          // Only include the parent step
          filteredSteps = [parentStep];
        }
      }

      // Calculate height based on filtered phases and steps
      const headerHeight = 40;
      const phaseHeight = filteredPhases.length * 40;
      const stepHeight = filteredSteps.length * 40;
      const calculatedHeight = headerHeight + phaseHeight + stepHeight;

      flowNodes.push({
        id: `parent-${parentJourney.id}`,
        type: 'journey-overview-node',
        data: {
          journey: parentJourney,
          phases: filteredPhases,
          steps: filteredSteps,
          onJourneyClick: () => {
            if (teamSlug && projectId) {
              navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}`);
            }
          },
        },
        position: { x: 0, y: 0 }, // Will be positioned by Dagre
        width: 300,
        height: calculatedHeight,
      });

      // Create edge from parent step's right handle to current journey's left handle
      // Connect from the step that this subjourney belongs to
      if (currentJourney.parent_step_id && parentStep && parentPhase) {
        // Get the phase color for the parent step
        const phaseColor = parentPhase.color || '#3B82F6';
        
        flowEdges.push({
          id: `edge-parent-${parentJourney.id}-${currentJourney.id}`,
          source: `parent-${parentJourney.id}`,
          sourceHandle: `journey-${parentJourney.id}-bottom-subjourney`, // Bottom handle of the parent journey overview node
          target: currentJourney.id,
          targetHandle: 'top', // Top handle of the journey node
          type: 'step-to-subjourney',
          style: {
            stroke: phaseColor,
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: phaseColor,
          },
        });

        // Find the next sequential step after the parent step
        // Sort all steps by phase sequence_order and step sequence_order
        const sortedPhases = [...parentPhases].sort((a, b) => a.sequence_order - b.sequence_order);
        const allStepsSorted: typeof parentSteps = [];
        sortedPhases.forEach((phase) => {
          const phaseSteps = parentSteps
            .filter(step => step.phase_id === phase.id)
            .sort((a, b) => a.sequence_order - b.sequence_order);
          allStepsSorted.push(...phaseSteps);
        });

        // Find the index of the parent step
        const parentStepIndex = allStepsSorted.findIndex(step => step.id === currentJourney.parent_step_id);
        
        // Get the next step if it exists
        if (parentStepIndex >= 0 && parentStepIndex < allStepsSorted.length - 1) {
          const nextStep = allStepsSorted[parentStepIndex + 1];
          const nextPhase = parentPhases.find(phase => phase.id === nextStep.phase_id);

          if (nextPhase) {
            // Calculate height based on filtered phases and steps (1 phase, 1 step)
            const headerHeight = 40;
            const phaseHeight = 1 * 40; // 1 phase
            const stepHeight = 1 * 40; // 1 step
            const calculatedNextHeight = headerHeight + phaseHeight + stepHeight;

            // Create journey overview node for the next step
            flowNodes.push({
              id: `next-${parentJourney.id}-${nextStep.id}`,
              type: 'journey-overview-node',
              data: {
                journey: parentJourney,
                phases: [nextPhase],
                steps: [nextStep],
                onJourneyClick: () => {
                  if (teamSlug && projectId) {
                    navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}`);
                  }
                },
              },
              position: { x: 0, y: 0 }, // Will be positioned manually
              width: 300,
              height: calculatedNextHeight,
            });

            // Create edge from journey node's right handle to next step's left target handle
            const nextPhaseColor = nextPhase.color || '#3B82F6';
            flowEdges.push({
              id: `edge-${currentJourney.id}-next-${nextStep.id}`,
              source: currentJourney.id,
              sourceHandle: 'next-step-right', // Right handle of the journey node
              target: `next-${parentJourney.id}-${nextStep.id}`,
              targetHandle: `step-${nextStep.id}-left-target`, // Left target handle of the next step
              type: 'step-to-subjourney',
              style: {
                stroke: nextPhaseColor,
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: nextPhaseColor,
              },
            });
          }
        }
      }
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
    
    // Position parent journey overview node to the left of the main journey node
    // and next step node to the right of the main journey node, using measured sizes
    if (currentJourney.is_subjourney && parentJourney) {
      const parentNodeId = `parent-${parentJourney.id}`;
      const parentNode = layouted.nodes.find(n => n.id === parentNodeId);
      const journeyNode = layouted.nodes.find(n => n.id === currentJourney.id);
      
      if (parentNode && journeyNode) {
        // Helper to read measured size via data attributes (zoom-compensated)
        // For filtered nodes, prefer the node's height prop (calculated) over measured sizes
        const getMeasuredSize = (node: Node, nodeId: string, fallbackWidth: number, fallbackHeight: number) => {
          let width = node.width || fallbackWidth;
          let height = node.height || fallbackHeight;
          
          // For filtered nodes (parent and next step), use the calculated height from node prop
          // Only use measured size if node height is not set (fallback case)
          if (nodeId.startsWith('parent-') || nodeId.startsWith('next-')) {
            // Prefer node's calculated height, only measure if not set
            if (!node.height) {
              const el = document.querySelector(`[data-journey-id="${nodeId}"]`) as HTMLElement | null;
              if (el) {
                const dw = parseInt(el.getAttribute('data-width') || '0', 10);
                const dh = parseInt(el.getAttribute('data-height') || '0', 10);
                if (dw > 0) width = dw;
                if (dh > 0) height = dh;
              }
            }
          } else {
            // For journey node, prefer measured size (it uses updateNodeInternals)
            const el = document.querySelector(`[data-journey-id="${nodeId}"]`) as HTMLElement | null;
            if (el) {
              const dw = parseInt(el.getAttribute('data-width') || '0', 10);
              const dh = parseInt(el.getAttribute('data-height') || '0', 10);
              if (dw > 0) width = dw;
              if (dh > 0) height = dh;
            }
          }
          return { width, height };
        };

        // Get sizes (for filtered nodes, prefer calculated height from node prop)
        const journeySize = getMeasuredSize(journeyNode, String(journeyNode.id), journeyNode.width || 400, journeyNode.height || 300);
        const parentSize = getMeasuredSize(parentNode, String(parentNode.id), parentNode.width || 300, parentNode.height || 250);
        
        // Position parent node above journey node with gap
        const verticalGap = 100;
        const horizontalGap = 100; // For next step node positioning
        parentNode.position = {
          x: (journeyNode.position?.x || 0) + (journeySize.width / 2) - (parentSize.width / 2), // Horizontally center align
          y: (journeyNode.position?.y || 0) - parentSize.height - verticalGap,
        };

        // Find and position next step node to the right of journey node
        const parentSteps = parentJourney.allSteps || [];
        const parentStep = parentSteps.find(step => step.id === currentJourney.parent_step_id);
        
        if (parentStep) {
          // Sort all steps to find next step
          const parentPhases = parentJourney.allPhases || [];
          const sortedPhases = [...parentPhases].sort((a, b) => a.sequence_order - b.sequence_order);
          const allStepsSorted: typeof parentSteps = [];
          sortedPhases.forEach((phase) => {
            const phaseSteps = parentSteps
              .filter(step => step.phase_id === phase.id)
              .sort((a, b) => a.sequence_order - b.sequence_order);
            allStepsSorted.push(...phaseSteps);
          });

          const parentStepIndex = allStepsSorted.findIndex(step => step.id === currentJourney.parent_step_id);
          
          if (parentStepIndex >= 0 && parentStepIndex < allStepsSorted.length - 1) {
            const nextStep = allStepsSorted[parentStepIndex + 1];
            const nextNodeId = `next-${parentJourney.id}-${nextStep.id}`;
            const nextNode = layouted.nodes.find(n => n.id === nextNodeId);
            
            if (nextNode) {
              const nextSize = getMeasuredSize(nextNode, String(nextNode.id), nextNode.width || 300, nextNode.height || 250);
              
              // Position next step node to the right of journey node with gap
              nextNode.position = {
                x: (journeyNode.position?.x || 0) + journeySize.width + horizontalGap,
                y: (journeyNode.position?.y || 0) + (journeySize.height / 2) - (nextSize.height / 2), // Vertically center align
              };
            }
          }
        }
      }
    }
    
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
      edgeTypes={edgeTypes}
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

