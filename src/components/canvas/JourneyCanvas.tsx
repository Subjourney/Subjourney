/**
 * Journey Canvas Component
 * Main React Flow canvas for rendering journeys with ELK.js automatic layout
 * 
 * Layout structure (top to bottom):
 * - Row 1: Parent journey overview node (if viewing a subjourney)
 * - Row 2: Main journey node (left) + Next step overview node (right, if exists)
 * - Row 3: All subjourney overview nodes (centered, side by side)
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
import { JourneyNode } from './JourneyNode';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { applyElkLayout } from './layout';
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
  const { currentJourney, setCurrentJourney, loadStepAttributesForJourney, setAttributes, isDraggingStep } = useAppStore();
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

  // Helper function to load parent journey
  const loadParentJourney = useCallback(async (journey: Journey) => {
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
        
        // Fetch parent journey (always reload to get fresh data)
        const parent = await journeysApi.getJourney(phase.journey_id, false);
        setParentJourney(parent);
      } catch (error) {
        console.error('Failed to load parent journey:', error);
        setParentJourney(null);
      }
    } else {
      setParentJourney(null);
    }
  }, [setParentJourney]);

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
          
          // Load parent journey if this is a subjourney
          await loadParentJourney(journey);
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
  }, [journeyId, setCurrentJourney, loadStepAttributesForJourney, setAttributes, projectId, loadParentJourney]);

  // Reload parent journey when currentJourney changes
  // This ensures parentJourney is fresh when steps/phases are deleted in the parent
  useEffect(() => {
    if (currentJourney && currentJourney.is_subjourney) {
      loadParentJourney(currentJourney);
    }
  }, [currentJourney?.id, currentJourney?.is_subjourney, loadParentJourney]);
  
  // Also reload parent journey when currentJourney object reference changes
  // This catches cases where the journey is reloaded (e.g., after step/phase deletion)
  // We use a ref to track the last journey object to avoid infinite loops
  const lastJourneyRef = useRef<Journey | null>(null);
  useEffect(() => {
    if (currentJourney && currentJourney.is_subjourney) {
      // Check if this is a different journey object (even with same ID)
      // This happens when journey is reloaded after mutations
      if (lastJourneyRef.current !== currentJourney) {
        lastJourneyRef.current = currentJourney;
        // Reload parent journey to ensure fresh data
        loadParentJourney(currentJourney);
      }
    } else {
      lastJourneyRef.current = null;
    }
  }, [currentJourney, loadParentJourney]);

  // Convert journey data to React Flow nodes and edges (raw, before ELK layout)
  const { nodes: rawNodes, edges } = useMemo(() => {
    if (!currentJourney) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    let nextNodeData: Node | null = null; // Store NextNode to add after JourneyNode

    // Row 1: If viewing a subjourney, create journey overview node for parent journey
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
          onPhaseClick: (phaseId: string) => {
            if (teamSlug && projectId) {
              navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}?phase=${phaseId}`);
            }
          },
          onStepClick: (stepId: string) => {
            if (teamSlug && projectId) {
              navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}?step=${stepId}`);
            }
          },
        },
        position: { x: 0, y: 0 }, // Will be positioned by ELK
        width: 300,
        height: calculatedHeight,
      });

      // Create edges from parent to both main journey and next node (to place them on same layer)
      if (currentJourney.parent_step_id && parentStep && parentPhase) {
        // Get the phase color for the parent step
        const phaseColor = parentPhase.color || '#3B82F6';
        
        // Edge from parent step to main journey (from right side of parent step to left side of JourneyNode)
        flowEdges.push({
          id: `edge-parent-${parentJourney.id}-${currentJourney.id}`,
          source: `parent-${parentJourney.id}`,
          sourceHandle: `step-${parentStep.id}`,
          target: currentJourney.id,
          targetHandle: 'parent-left',
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

        // Layout edge from parent to journey node (ensures parent is positioned to the left)
        flowEdges.push({
          id: `edge-parent-${parentJourney.id}-${currentJourney.id}-layout`,
          source: `parent-${parentJourney.id}`,
          sourceHandle: `journey-${parentJourney.id}-bottom-subjourney`,
          target: currentJourney.id,
          targetHandle: 'parent-left',
          type: 'default',
          style: {
            stroke: 'transparent', // Invisible edge, just for ELK layout
            strokeWidth: 0,
            opacity: 0,
          },
        });

        // Find the next sequential step after the parent step
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

            // Store next node info to add after main journey node (for proper ordering)
            // We'll add it after the main journey node so ELK places JourneyNode first (left)
            const nextNodeId = `next-${parentJourney.id}-${nextStep.id}`;
            nextNodeData = {
              id: nextNodeId,
              type: 'journey-overview-node' as const,
              data: {
                journey: parentJourney,
                phases: [nextPhase],
                steps: [nextStep],
                onJourneyClick: () => {
                  if (teamSlug && projectId) {
                    navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}`);
                  }
                },
                onPhaseClick: (phaseId: string) => {
                  if (teamSlug && projectId) {
                    navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}?phase=${phaseId}`);
                  }
                },
                onStepClick: (stepId: string) => {
                  if (teamSlug && projectId) {
                    navigate(`/${teamSlug}/project/${projectId}/journey/${parentJourney.id}?step=${stepId}`);
                  }
                },
              },
              position: { x: 0, y: 0 },
              width: 300,
              height: calculatedNextHeight,
            };

            // Layout edge from parent to next node (places it on same layer as main journey)
            // This invisible edge ensures NextNode is positioned on the same row as JourneyNode
            flowEdges.push({
              id: `edge-parent-${parentJourney.id}-next-${nextStep.id}-layout`,
              source: `parent-${parentJourney.id}`,
              sourceHandle: `journey-${parentJourney.id}-bottom-subjourney`,
              target: nextNodeId,
              targetHandle: `journey-${parentJourney.id}-header-left`,
              type: 'default',
              style: {
                stroke: 'transparent', // Invisible edge, just for ELK layout
                strokeWidth: 0,
                opacity: 0,
              },
            });

            // Visual edge from main journey to next node (for the dashed connector)
            flowEdges.push({
              id: `edge-${currentJourney.id}-next-${nextStep.id}-visual`,
              source: currentJourney.id,
              sourceHandle: 'next-step-right',
              target: nextNodeId,
              targetHandle: `step-${nextStep.id}-left-target`,
              type: 'default',
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

    // Row 2: Create node for main journey (must come before NextNode for left positioning)
    flowNodes.push({
      id: currentJourney.id,
      type: 'journey-node',
      data: { journey: currentJourney },
      position: { x: 0, y: 0 }, // Will be positioned by ELK
      // Width and height will be read from data-width/data-height attributes by ELK
      width: 400, // Default fallback
      height: 300, // Default fallback
    });

    // Add NextNode after JourneyNode (ensures JourneyNode is on left, NextNode on right)
    if (nextNodeData) {
      flowNodes.push(nextNodeData);
    }

    // Row 3: Subjourney nodes underneath the journey node
    if (currentJourney.subjourneys && currentJourney.subjourneys.length > 0) {
      const allPhases = currentJourney.allPhases || [];
      const allSteps = currentJourney.allSteps || [];
      const stepToPhase = new Map<string, typeof allPhases[0]>();
      const stepToStep = new Map<string, typeof allSteps[0]>();
      
      // Build step to phase and step to step maps
      currentJourney.subjourneys.forEach((subjourney) => {
        if (subjourney.parent_step_id && !stepToPhase.has(subjourney.parent_step_id)) {
          const step = allSteps.find(s => s.id === subjourney.parent_step_id);
          if (step) {
            stepToStep.set(subjourney.parent_step_id, step);
            const phase = allPhases.find(p => p.id === step.phase_id);
            if (phase) {
              stepToPhase.set(subjourney.parent_step_id, phase);
            }
          }
        }
      });

      // Sort subjourneys by phase sequence_order, then by step sequence_order within the same phase
      const sortedSubjourneys = [...currentJourney.subjourneys].sort((a, b) => {
        const phaseA = a.parent_step_id ? stepToPhase.get(a.parent_step_id) : null;
        const phaseB = b.parent_step_id ? stepToPhase.get(b.parent_step_id) : null;
        const stepA = a.parent_step_id ? stepToStep.get(a.parent_step_id) : null;
        const stepB = b.parent_step_id ? stepToStep.get(b.parent_step_id) : null;

        // If either subjourney has no parent step, put it at the end
        if (!phaseA && !phaseB) return 0;
        if (!phaseA) return 1;
        if (!phaseB) return -1;

        // Sort by phase sequence_order first
        const phaseOrderA = phaseA.sequence_order ?? Number.MAX_SAFE_INTEGER;
        const phaseOrderB = phaseB.sequence_order ?? Number.MAX_SAFE_INTEGER;
        if (phaseOrderA !== phaseOrderB) {
          return phaseOrderA - phaseOrderB;
        }

        // If same phase, sort by step sequence_order
        if (stepA && stepB) {
          const stepOrderA = stepA.sequence_order ?? Number.MAX_SAFE_INTEGER;
          const stepOrderB = stepB.sequence_order ?? Number.MAX_SAFE_INTEGER;
          if (stepOrderA !== stepOrderB) {
            return stepOrderA - stepOrderB;
          }
        }

        // Fallback to ID for stable sort
        return String(a.id).localeCompare(String(b.id));
      });

      sortedSubjourneys.forEach((subjourney) => {
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
            onPhaseClick: (phaseId: string) => {
              if (teamSlug && projectId) {
                navigate(`/${teamSlug}/project/${projectId}/journey/${subjourney.id}?phase=${phaseId}`);
              }
            },
            onStepClick: (stepId: string) => {
              if (teamSlug && projectId) {
                navigate(`/${teamSlug}/project/${projectId}/journey/${subjourney.id}?step=${stepId}`);
              }
            },
          },
          position: { x: 0, y: 0 }, // Will be positioned by ELK
          width: 300,
          height: subCalculatedHeight,
        });

        // Connect from main journey to subjourney (all subjourneys on same level below)
        if (subjourney.parent_step_id) {
          const parentStepId = subjourney.parent_step_id;
          const phase = stepToPhase.get(parentStepId);
          const phaseColor = phase?.color || '#3B82F6';
          
          flowEdges.push({
            id: `edge-step-${parentStepId}-to-subjourney-${subjourney.id}`,
            source: currentJourney.id,
            sourceHandle: `step-${parentStepId}`,
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
  }, [currentJourney, parentJourney, teamSlug, projectId, navigate]);

  // Apply ELK.js layout to nodes
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    if (rawNodes.length === 0) {
      setNodes([]);
      return;
    }

    // Filter edges for ELK layout - only use hierarchy edges, exclude visual-only edges
    // Visual edges (like the dashed connector from main journey to next node) should not affect layout
    const layoutEdges = edges.filter((edge) => {
      // Exclude visual-only edges (those with -visual suffix)
      // These are rendered but don't affect node positioning
      return !edge.id.includes('-visual');
    });

    // Apply ELK layout - Top to Bottom hierarchical layout
    applyElkLayout(rawNodes, layoutEdges, {
      direction: 'TB', // Top to Bottom
      nodeSep: 50, // Vertical spacing between nodes in same layer
      rankSep: 100, // Horizontal spacing between layers
      marginX: 50,
      marginY: 50,
      preferDomMeasurements: true, // Read from data-width/data-height attributes
    })
      .then((layouted) => {
        // Update node width/height from actual DOM measurements
        // This is critical for React Flow's fitView to work correctly
        // React Flow uses node.width and node.height properties, not DOM attributes
        const updateNodeSizes = (nodes: Node[]): Node[] => {
          return nodes.map((node) => {
            // Try to get actual measured size from DOM
            const nodeElement = document.querySelector(
              `[data-journey-node="true"][data-journey-id="${node.id}"]`
            ) as HTMLElement | null;
            
            if (nodeElement) {
              const measuredWidth = nodeElement.getAttribute('data-width');
              const measuredHeight = nodeElement.getAttribute('data-height');
              
              if (measuredWidth && measuredHeight) {
                const width = parseInt(measuredWidth, 10);
                const height = parseInt(measuredHeight, 10);
                
                // Only update if we got valid measurements
                if (width > 0 && height > 0) {
                  return {
                    ...node,
                    width,
                    height,
                  };
                }
              }
            }
            
            // Fallback to existing width/height if measurement not available yet
            return node;
          });
        };

        // Post-process: Ensure ParentNode is on the left, JourneyNode in the middle, and NextNode on the right, all vertically centered
        const processNodePositions = (nodes: Node[]): void => {
          const journeyNode = nodes.find(n => n.type === 'journey-node');
          const parentNode = nodes.find(n => n.id.startsWith('parent-'));
          const nextNode = nodes.find(n => n.id.startsWith('next-'));
          
          if (journeyNode) {
            const journeyY = journeyNode.position?.y || 0;
              const journeyX = journeyNode.position?.x || 0;
            const journeyHeight = journeyNode.height || 400;
                const journeyWidth = journeyNode.width || 400;
            const journeyCenterY = journeyY + journeyHeight / 2;
            const spacing = 100; // Spacing between nodes
                
            // Position parent node to the left of journey node
            if (parentNode) {
              const parentHeight = parentNode.height || 200;
              const parentYCentered = journeyCenterY - parentHeight / 2;
              const parentX = journeyX - spacing - (parentNode.width || 300);
              
              parentNode.position = {
                ...parentNode.position!,
                x: parentX,
                y: parentYCentered,
                };
            }
                
            // Position next node to the right of journey node
            if (nextNode) {
              const nextHeight = nextNode.height || 200;
              const nextYCentered = journeyCenterY - nextHeight / 2;
              const nextX = journeyX + journeyWidth + spacing;
              
                nextNode.position = {
                  ...nextNode.position!,
                x: nextX,
                y: nextYCentered,
                };
            }
          }
        };

        // Try to update sizes immediately
        let updatedNodes = updateNodeSizes(layouted.nodes);
        
        // Check if all nodes have valid measurements
        const allMeasured = updatedNodes.every((node) => {
          const nodeElement = document.querySelector(
            `[data-journey-node="true"][data-journey-id="${node.id}"]`
          ) as HTMLElement | null;
          if (!nodeElement) return true; // If element doesn't exist, skip check
          const w = nodeElement.getAttribute('data-width');
          const h = nodeElement.getAttribute('data-height');
          return w && h && parseInt(w, 10) > 0 && parseInt(h, 10) > 0;
        });

        if (!allMeasured) {
          // Retry after DOM has had time to render and measure
          setTimeout(() => {
            updatedNodes = updateNodeSizes(layouted.nodes);
            processNodePositions(updatedNodes);
            setNodes(updatedNodes);
          }, 150);
        } else {
          // All measurements available, process and set nodes
          processNodePositions(updatedNodes);
          setNodes(updatedNodes);
        }
      })
      .catch((error) => {
        console.error('ELK layout error:', error);
        // Fallback to raw nodes if layout fails
        setNodes(rawNodes);
      });
  }, [rawNodes, edges]);

  // Whenever we load a new journey, show the canvas overlay again
  useEffect(() => {
    if (currentJourney) {
      setIsFittingView(true);
      setIsFadingOut(false);
    }
  }, [currentJourney?.id]);

  // Fit view after all nodes are measured and positioned
  // Wait for JourneyNode and all JourneyOverviewNode components to be measured
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Find the JourneyNode (there's only ever one)
    const journeyNode = nodes.find((n) => n.type === 'journey-node');
    if (!journeyNode) return;

    // Find all JourneyOverviewNode components (parent, next, subjourneys)
    const overviewNodes = nodes.filter((n) => n.type === 'journey-overview-node');

    let rafId = 0;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~60 frames (~1s) fallback to ensure measurements are ready

    const tryFit = () => {
      if (cancelled) return;
      attempts += 1;

      // Check JourneyNode measurement
      const journeyEl = document.querySelector(
        `[data-journey-node="true"][data-journey-id="${journeyNode.id}"]`
      ) as HTMLElement | null;
      const journeyMeasured =
        !!journeyEl &&
        (() => {
          const w = parseInt(journeyEl.getAttribute('data-width') || '0', 10);
          const h = parseInt(journeyEl.getAttribute('data-height') || '0', 10);
          return w > 0 && h > 0;
        })();

      // Check all JourneyOverviewNode measurements
      const allOverviewNodesMeasured = overviewNodes.every((node) => {
        const overviewEl = document.querySelector(
          `[data-journey-node="true"][data-journey-id="${node.id}"]`
        ) as HTMLElement | null;
        if (!overviewEl) return false;
        const w = parseInt(overviewEl.getAttribute('data-width') || '0', 10);
        const h = parseInt(overviewEl.getAttribute('data-height') || '0', 10);
        return w > 0 && h > 0;
      });

      // Wait for all nodes to be measured, or timeout
      const allMeasured = journeyMeasured && (overviewNodes.length === 0 || allOverviewNodesMeasured);

      // When there are overview nodes, ensure they're not all at the same position (0,0)
      // This indicates ELK layout hasn't completed yet
      const layoutComplete = overviewNodes.length === 0 || 
        overviewNodes.some((node) => {
          const pos = node.position;
          return pos && (pos.x !== 0 || pos.y !== 0);
        });

      if ((allMeasured && layoutComplete) || attempts >= maxAttempts) {
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

        if (selectedStep && !isDraggingStep) {
          const stepEl = document.querySelector(`[data-step-id="${selectedStep}"]`) as HTMLElement | null;
          if (stepEl && journeyEl) {
            // Only zoom on user-click selection when clipped
            if (isClipped(stepEl)) {
              centerOnRect(stepEl, journeyEl, 1.3);
            }
          }
          // Don't call fitView if step element doesn't exist - likely deleted
        } else if (selectedPhase) {
          const phaseEl = document.querySelector(`[data-phase-id="${selectedPhase}"]`) as HTMLElement | null;
          if (phaseEl && journeyEl) {
            if (isClipped(phaseEl)) {
              centerOnRect(phaseEl, journeyEl, 1.15);
            }
          }
          // Don't call fitView if phase element doesn't exist - likely deleted
        } else {
          // No selection: only auto-fit on initial load, not on deselection
          if (isFittingView) {
            // Adjust padding based on whether there are JourneyOverviewNode components
            // When there are overview nodes, use standard padding
            // When there are no overview nodes, use slightly more padding to avoid over-zooming
            const hasOverviewNodes = overviewNodes.length > 0;
            const padding = hasOverviewNodes ? 0.25 : 0.3;
            fitView({ padding, includeHiddenNodes: true });
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
  }, [nodes, fitView, selectedStep, selectedPhase, isFittingView, isDraggingStep]);


  const onNodesChange = useCallback((_changes: unknown[]) => {
    // Handle node changes (position updates, etc.)
  }, []);

  const onEdgesChange = useCallback((_changes: unknown[]) => {
    // Handle edge changes
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

