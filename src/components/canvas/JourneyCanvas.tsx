/**
 * Journey Canvas Component
 * Main React Flow canvas for rendering journeys with manual layout
 */

import { useCallback, useEffect, useMemo, memo, useState, useRef } from 'react';
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
// Note: Dagre removed - using manual positioning
import { JourneyNode } from './JourneyNode';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi, attributesApi } from '../../api';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import type { Journey } from '../../types';
import { useRealtimeAttributes } from '../../hooks/useRealtimeAttributes';

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
  backgroundDotColor,
  initialTarget,
}: { 
  journeyId: string;
  backgroundDotColor?: string;
  initialTarget?: { type: 'phase' | 'step'; id: string };
}) {
  // Realtime subscriptions for attributes/step_attributes
  useRealtimeAttributes();
  const { currentJourney, setCurrentJourney, loadStepAttributesForJourney, setAttributes } = useAppStore();
  const { clearSelection, selectedPhase, selectedStep } = useSelection();
  const { fitView, getNode, setCenter, getViewport, getZoom } = useReactFlow();
  const [parentJourney, setParentJourney] = useState<Journey | null>(null);
  const [isFittingView, setIsFittingView] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fitHideTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { teamSlug, projectId } = useParams<{
    teamSlug: string;
    projectId: string;
  }>();
  const initialZoomHandledRef = useRef(false);

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
          
          // Load all attributes for the team/project (for selector)
          if (journey.team_id) {
            try {
              const allAttributes = await attributesApi.getAttributes(
                String(journey.team_id),
                projectId
              );
              setAttributes(allAttributes);
            } catch (error) {
              console.error('Failed to load attributes:', error);
            }
          }

          // Load step attributes for all steps in the journey
          try {
            await loadStepAttributesForJourney(journey);
          } catch (error) {
            console.error('Failed to load step attributes:', error);
          }
          
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
  }, [journeyId, setCurrentJourney, loadStepAttributesForJourney, setAttributes, projectId]);

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
        position: { x: 0, y: 0 }, // Will be positioned manually
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
            flowEdges.push({
              id: `edge-${currentJourney.id}-next-${nextStep.id}`,
              source: currentJourney.id,
              sourceHandle: 'next-step-right', // Right handle of the journey node
              target: `next-${parentJourney.id}-${nextStep.id}`,
              targetHandle: `step-${nextStep.id}-left-target`, // Left target handle of the next step
              type: 'step-to-subjourney',
              style: {
                stroke: 'var(--color-connector-dashed)',
                strokeWidth: 2,
                strokeDasharray: '5,5',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'var(--color-connector-dashed)',
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
      position: { x: 0, y: 0 }, // Will be positioned manually
    });

    // Subjourney nodes underneath the journey node (one for each subjourney, unfiltered)
    if (currentJourney.subjourneys && currentJourney.subjourneys.length > 0) {
      // Build a map of steps that have subjourneys
      const stepToSubjourneys = new Map<string, typeof currentJourney.subjourneys>();
      const allPhases = currentJourney.allPhases || [];
      const stepToPhase = new Map<string, typeof allPhases[0]>();
      
      currentJourney.subjourneys.forEach((subjourney) => {
        if (subjourney.parent_step_id) {
          if (!stepToSubjourneys.has(subjourney.parent_step_id)) {
            stepToSubjourneys.set(subjourney.parent_step_id, []);
          }
          stepToSubjourneys.get(subjourney.parent_step_id)!.push(subjourney);
          
          // Find the phase for this step
          if (!stepToPhase.has(subjourney.parent_step_id)) {
            const allPhases = currentJourney.allPhases || [];
            const allSteps = currentJourney.allSteps || [];
            const step = allSteps.find(s => s.id === subjourney.parent_step_id);
            if (step) {
              const phase = allPhases.find(p => p.id === step.phase_id);
              if (phase) {
                stepToPhase.set(subjourney.parent_step_id, phase);
              }
            }
          }
        }
      });

      currentJourney.subjourneys.forEach((subjourney) => {
        const subPhases = subjourney.allPhases || [];
        const subSteps = subjourney.allSteps || [];
        const subHeaderHeight = 40;
        const subPhaseHeight = subPhases.length * 40;
        const subStepHeight = subSteps.length * 40;
        const subCalculatedHeight = subHeaderHeight + subPhaseHeight + subStepHeight;

        flowNodes.push({
          id: `subjourneyNode-${subjourney.id}`,
          type: 'journey-overview-node',
          data: {
            journey: subjourney,
            phases: subPhases,
            steps: subSteps,
            onJourneyClick: () => {
              if (teamSlug && projectId) {
                navigate(`/${teamSlug}/project/${projectId}/journey/${subjourney.id}`);
              }
            },
          },
          position: { x: 0, y: 0 }, // Will be positioned manually
          width: 300,
          height: subCalculatedHeight,
        });

        // Connect from parent step's bottom handle to subjourney's top handle
        if (subjourney.parent_step_id) {
          const parentStepId = subjourney.parent_step_id;
          const phase = stepToPhase.get(parentStepId);
          const phaseColor = phase?.color || '#3B82F6';
          
          flowEdges.push({
            id: `edge-step-${parentStepId}-to-subjourney-${subjourney.id}`,
            source: currentJourney.id,
            sourceHandle: `step-${parentStepId}`, // Handle from StepComponent (position Bottom)
            target: `subjourneyNode-${subjourney.id}`,
            targetHandle: `journey-${subjourney.id}-top-subjourney`,
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
        }
      });
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [currentJourney, parentJourney]);

  // Whenever we load a new journey, show the canvas overlay again
  useEffect(() => {
    if (currentJourney) {
      setIsFittingView(true);
      setIsFadingOut(false);
    }
  }, [currentJourney?.id]);

  // Fit view after JourneyNode mounts and measured size is available
  // Center the entire canvas (all nodes), using JourneyNode measurement as readiness signal
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Find the JourneyNode (there's only ever one)
    const journeyNode = nodes.find((n) => n.type === 'journey-node');
    if (!journeyNode) return;

    let rafId = 0;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~60 frames (~1s) fallback to ensure measurements are ready

    const tryFit = () => {
      if (cancelled) return;
      attempts += 1;

      // Only check the JourneyNode measurement (not PortalNodes)
      const journeyEl = document.querySelector(
        `[data-journey-node="true"][data-journey-id="${journeyNode.id}"]`
      ) as HTMLElement | null;
      const isMeasured =
        !!journeyEl &&
        (() => {
          const w = parseInt(journeyEl.getAttribute('data-width') || '0', 10);
          const h = parseInt(journeyEl.getAttribute('data-height') || '0', 10);
          return w > 0 && h > 0;
        })();

      if (isMeasured || attempts >= maxAttempts) {
        // Compute a custom center/zoom for phase/step selection
        const centerOnRect = (targetEl: HTMLElement, journeyElEl: HTMLElement, paddingMultiplier: number) => {
          const journeyNodeFlow = getNode(String(journeyNode.id));
          if (!journeyNodeFlow) {
            fitView({ padding: 0.25, includeHiddenNodes: true });
            return;
          }
          const viewport = (typeof getViewport === 'function' ? getViewport() : null) as unknown as { width?: number; height?: number } | null;
          const viewW = viewport?.width || window.innerWidth || 1;
          const viewH = viewport?.height || window.innerHeight || 1;
          const zoomNow = typeof getZoom === 'function' ? getZoom() : 1;

          const targetRect = targetEl.getBoundingClientRect();
          const journeyRect = journeyElEl.getBoundingClientRect();

          // Center of target relative to journey element (in screen px)
          const relCx = (targetRect.left - journeyRect.left) + targetRect.width / 2;
          const relCy = (targetRect.top - journeyRect.top) + targetRect.height / 2;

          // Convert to flow coordinates using current zoom
          const centerX = journeyNodeFlow.position.x + relCx / Math.max(zoomNow, 0.01);
          const centerY = journeyNodeFlow.position.y + relCy / Math.max(zoomNow, 0.01);

          // Desired zoom to fit target with padding (normalize for current zoom for consistency)
          const pad = Math.max(1, paddingMultiplier);
          const targetFlowW = targetRect.width / Math.max(zoomNow, 0.01);
          const targetFlowH = targetRect.height / Math.max(zoomNow, 0.01);
          const zoomX = viewW / (targetFlowW * pad);
          const zoomY = viewH / (targetFlowH * pad);
          let desiredZoom = Math.min(zoomX, zoomY);
          desiredZoom = Math.max(0.4, Math.min(2.0, desiredZoom));

          setCenter(centerX, centerY, { zoom: desiredZoom, duration: 400 });
        };

        // Helper: check if an element is clipped by the canvas viewport
        const isClipped = (el: HTMLElement): boolean => {
          const container = document.querySelector('.react-flow') as HTMLElement | null;
          const viewportRect = container?.getBoundingClientRect() || document.body.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          const pad = 4;
          return r.left < viewportRect.left + pad ||
                 r.top < viewportRect.top + pad ||
                 r.right > viewportRect.right - pad ||
                 r.bottom > viewportRect.bottom - pad;
        };

        // Initial navigation intent: zoom to target once even if visible
        if (!initialZoomHandledRef.current && initialTarget && journeyEl) {
          if (initialTarget.type === 'step') {
            const stepEl = document.querySelector(`[data-step-id="${initialTarget.id}"]`) as HTMLElement | null;
            if (stepEl) {
              centerOnRect(stepEl, journeyEl, 1.3);
              initialZoomHandledRef.current = true;
              return;
            }
          } else if (initialTarget.type === 'phase') {
            const phaseEl = document.querySelector(`[data-phase-id="${initialTarget.id}"]`) as HTMLElement | null;
            if (phaseEl) {
              centerOnRect(phaseEl, journeyEl, 1.15);
              initialZoomHandledRef.current = true;
              return;
            }
          }
          initialZoomHandledRef.current = true;
        }

        if (selectedStep) {
          const stepEl = document.querySelector(`[data-step-id="${selectedStep}"]`) as HTMLElement | null;
          if (stepEl && journeyEl) {
            // Only zoom on user-click selection when clipped
            if (isClipped(stepEl)) {
              centerOnRect(stepEl, journeyEl, 1.3);
            }
          } else {
            fitView({ padding: 0.25, includeHiddenNodes: true });
          }
        } else if (selectedPhase) {
          const phaseEl = document.querySelector(`[data-phase-id="${selectedPhase}"]`) as HTMLElement | null;
          if (phaseEl && journeyEl) {
            if (isClipped(phaseEl)) {
              centerOnRect(phaseEl, journeyEl, 1.15);
            }
          } else {
            fitView({ padding: 0.25, includeHiddenNodes: true });
          }
        } else {
          // No selection: only auto-fit on initial load, not on deselection
          if (isFittingView) {
            fitView({ padding: 0.25, includeHiddenNodes: true });
          }
        }

        // Delay before starting fade-out, then fade out, then remove from DOM
        if (!cancelled) {
          if (fitHideTimerRef.current) {
            window.clearTimeout(fitHideTimerRef.current);
          }
          // Wait 100ms before starting fade-out
          fitHideTimerRef.current = window.setTimeout(() => {
            setIsFadingOut(true);
            // After fade transition completes (100ms), remove from DOM
            fitHideTimerRef.current = window.setTimeout(() => {
              setIsFittingView(false);
              setIsFadingOut(false);
            }, 200);
          }, 200);
        }
        return;
      }
      rafId = requestAnimationFrame(tryFit);
    };

    rafId = requestAnimationFrame(tryFit);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (fitHideTimerRef.current) {
        window.clearTimeout(fitHideTimerRef.current);
      }
    };
  }, [nodes, fitView, selectedStep, selectedPhase, isFittingView]);


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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        proOptions={proOptions}
        attributionPosition="bottom-left"
        elevateEdgesOnSelect={true}
        elevateNodesOnSelect={false}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll={true}
        selectionOnDrag={true}
        elementsSelectable={true}
        nodesDraggable={false}
        panOnDrag={[1]}
      >
        <Background color={backgroundDotColor || defaultDotColor} />
        <Controls />
      </ReactFlow>

      {isFittingView && (
        <div
          className={isFadingOut ? 'canvas-overlay-fade-out' : 'canvas-overlay'}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface-1)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div className="canvas-spinner" />
        </div>
      )}
    </div>
  );
}

/**
 * Journey Canvas - Main canvas component with React Flow provider
 */
export function JourneyCanvas({ 
  journeyId, 
  backgroundDotColor,
  initialTarget,
}: { 
  journeyId: string;
  backgroundDotColor?: string;
  initialTarget?: { type: 'phase' | 'step'; id: string };
}) {
  return (
    <ReactFlowProvider key={journeyId}>
      <div style={{ width: '100%', height: '100vh' }}>
        <JourneyCanvasInner
          key={journeyId}
          journeyId={journeyId}
          backgroundDotColor={backgroundDotColor}
          initialTarget={initialTarget}
        />
      </div>
    </ReactFlowProvider>
  );
}

