/**
 * Project Canvas Component
 * Main React Flow canvas for rendering journey overview nodes directly
 */

import { useCallback, useMemo, memo, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { ProjectSetupNode } from './ProjectSetupNode';
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { applyElkLayout } from './layout';
import { useSelection, useAppStore } from '../../store';
import type { Project, Journey, Phase, Step } from '../../types';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  'journey-overview-node': memo(JourneyOverviewNode),
  'project-setup-node': memo(ProjectSetupNode),
};

const edgeTypes = {
  'step-to-subjourney': memo(StepToSubjourneyEdge),
};

const proOptions = { hideAttribution: true };

interface ProjectCanvasInnerProps {
  project: Project;
  journeys: Journey[];
  journeyPhases?: Record<string, Phase[]>; // Map of journey ID to phases
  phaseSteps?: Record<string, Step[]>; // Map of phase ID to steps
  teamSlug: string;
  onJourneyClick?: (journeyId: string) => void;
  onPhaseClick?: (phaseId: string) => void;
  onStepClick?: (stepId: string) => void;
  onImportJourney?: () => void;
  onCreateJourney?: () => void;
  backgroundDotColor?: string; // Color for the canvas background dots
}

function ProjectCanvasInner({
  project,
  journeys,
  journeyPhases = {},
  phaseSteps = {},
  teamSlug,
  onJourneyClick,
  onPhaseClick,
  onStepClick,
  onImportJourney,
  onCreateJourney,
  backgroundDotColor, // Color for canvas background dots (defaults to CSS variable)
}: ProjectCanvasInnerProps) {
  const { clearSelection, select } = useSelection();
  const navigate = useNavigate();

  // Get spacing controls from Zustand store
  const {
    canvasNodeSep: nodeSep,
    canvasRankSep: rankSep,
    canvasMainJourneySep: rowSep,
    canvasSpacingPanelMinimized: isMinimized,
    setCanvasNodeSep: setNodeSep,
    setCanvasRankSep: setRankSep,
    setCanvasMainJourneySep: setRowSep,
    setCanvasSpacingPanelMinimized: setIsMinimized,
  } = useAppStore();

  // Get default background dot color from CSS variable
  const defaultDotColor = useMemo(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const computedColor = getComputedStyle(root).getPropertyValue('--canvas-dot-color').trim();
      return computedColor || 'rgba(255, 255, 255, 0.15)';
    }
    return 'rgba(255, 255, 255, 0.15)';
  }, []);

  const handleJourneyClick = useCallback(
    (journeyId: string) => {
      if (onJourneyClick) {
        onJourneyClick(journeyId);
      } else {
        navigate(`/${teamSlug}/project/${project.id}/journey/${journeyId}`);
      }
    },
    [onJourneyClick, navigate, teamSlug, project.id]
  );

  // Helper function to add spacing between rows (main journey + all its descendants)
  // Each row consists of a main journey and all its subjourneys at any level
  // This ensures proper spacing between complete journey hierarchies
  const addSpacingBetweenRows = useCallback((
    layoutedNodes: Node[],
    allJourneys: Journey[],
    extraSpacing: number
  ): Node[] => {
    if (extraSpacing <= 0) return layoutedNodes;

    // Build maps for quick lookups
    const journeyMap = new Map<string, Journey>();
    allJourneys.forEach(j => journeyMap.set(j.id, j));

    // Build stepIdToJourneyId map
    const stepIdToJourneyId = new Map<string, string>();
    journeys.forEach((journey) => {
      const phases = journeyPhases[journey.id] || [];
      phases.forEach((phase) => {
        const steps = phaseSteps[phase.id] || [];
        steps.forEach((step) => {
          stepIdToJourneyId.set(step.id, journey.id);
        });
      });
    });

    // Find all main journeys (top-level)
    const mainJourneys = allJourneys.filter(j => !j.is_subjourney);
    
    // For each main journey, find ALL its descendant nodes (including itself)
    const findDescendants = (mainJourneyId: string): Node[] => {
      const descendants: Node[] = [];
      
      // Add the main journey node itself
      const mainNode = layoutedNodes.find(n => n.id === mainJourneyId);
      if (mainNode) {
        descendants.push(mainNode);
      }
      
      // Recursively find all subjourneys
      const findSubjourneys = (targetParentJourneyId: string) => {
        allJourneys.forEach(journey => {
          if (journey.is_subjourney && journey.parent_step_id) {
            const journeyParentId = stepIdToJourneyId.get(journey.parent_step_id);
            if (journeyParentId === targetParentJourneyId) {
              const node = layoutedNodes.find(n => n.id === journey.id);
              if (node) {
                descendants.push(node);
                // Recursively find subjourneys of this subjourney
                findSubjourneys(journey.id);
              }
            }
          }
        });
      };
      
      findSubjourneys(mainJourneyId);
      return descendants;
    };

    // Build rows: each row contains a main journey and all its descendants
    const rows = mainJourneys
      .sort((a, b) => {
        const orderA = a.sequence_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sequence_order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      })
      .map(mainJourney => ({
        mainJourneyId: mainJourney.id,
        nodes: findDescendants(mainJourney.id),
      }))
      .filter(row => row.nodes.length > 0);

    if (rows.length <= 1) return layoutedNodes;

    // Sort rows by the topmost Y position
    const sortedRows = rows.sort((a, b) => {
      const topA = Math.min(...a.nodes.map(n => n.position?.y || 0));
      const topB = Math.min(...b.nodes.map(n => n.position?.y || 0));
      return topA - topB;
    });

    // Add extra spacing between rows - apply equal spacing to each gap independently
    const result = layoutedNodes.map(n => ({ ...n }));

    for (let i = 0; i < sortedRows.length - 1; i++) {
      const currentRow = sortedRows[i];
      const nextRow = sortedRows[i + 1];

      // Find bottom of current row (bottom-most node in the entire hierarchy)
      // Use the current positions in result (which may have been shifted)
      const bottomOfCurrent = Math.max(
        ...currentRow.nodes.map(n => {
          const node = result.find(r => r.id === n.id);
          return (node?.position?.y || 0) + (node?.height || 250);
        })
      );

      // Find top of next row (top-most node in the next hierarchy)
      // Use the current positions in result (which may have been shifted)
      const topOfNext = Math.min(
        ...nextRow.nodes.map(n => {
          const node = result.find(r => r.id === n.id);
          return node?.position?.y || 0;
        })
      );

      // Calculate the desired position for the next row to achieve exactly extraSpacing gap
      const desiredTopOfNext = bottomOfCurrent + extraSpacing;
      const spaceToAdd = desiredTopOfNext - topOfNext;
      
      // Apply the shift to make this gap exactly extraSpacing
      // Only shift the next row and all subsequent rows (not accumulating, just applying the same shift)
      if (spaceToAdd !== 0) {
        for (let j = i + 1; j < sortedRows.length; j++) {
          sortedRows[j].nodes.forEach(node => {
            const nodeIndex = result.findIndex(n => n.id === node.id);
            if (nodeIndex >= 0) {
              result[nodeIndex] = {
                ...result[nodeIndex],
                position: {
                  ...result[nodeIndex].position!,
                  y: (result[nodeIndex].position?.y || 0) + spaceToAdd,
                },
              };
            }
          });
        }
      }
    }

    return result;
  }, [journeys, journeyPhases, phaseSteps]);

  // Create nodes and edges structure
  const { nodes: rawNodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Show setup node if project has no journeys
    if (journeys.length === 0) {
      const setupNode: Node = {
        id: `project-setup-${project.id}`,
        type: 'project-setup-node',
        data: {
          onImportJourney,
          onCreateJourney,
        },
        position: { x: 0, y: 0 }, // Will be positioned manually
        width: 400,
        height: 200,
      };
      flowNodes.push(setupNode);
      return { nodes: flowNodes, edges: flowEdges };
    }

    // Build a map from stepId -> parentJourneyId, stepId -> phase color, and stepId -> step
    const stepIdToJourneyId = new Map<string, string>();
    const stepIdToPhaseColor = new Map<string, string>();
    const stepIdToStep = new Map<string, Step>();
    const journeyIdToJourney = new Map<string, Journey>();

    journeys.forEach((journey) => {
      journeyIdToJourney.set(journey.id, journey);
    });

    journeys.forEach((journey) => {
      const phases = journeyPhases[journey.id] || [];
      phases.forEach((phase) => {
        const steps = phaseSteps[phase.id] || [];
        steps.forEach((step) => {
          stepIdToJourneyId.set(step.id, journey.id);
          stepIdToPhaseColor.set(step.id, phase.color || '#3B82F6');
          stepIdToStep.set(step.id, step);
        });
      });
    });

    // Create journey overview nodes for ALL journeys (main and subjourneys)
    journeys.forEach((journey) => {
      const phases = journeyPhases[journey.id] || [];
      const allSteps: Step[] = [];
      phases.forEach((phase) => {
        const steps = phaseSteps[phase.id] || [];
        allSteps.push(...steps);
      });

      // Calculate approximate height based on phases and steps
      const headerHeight = 40;
      const phaseHeight = phases.length * 40;
      const stepHeight = allSteps.length * 40;
      const calculatedHeight = headerHeight + phaseHeight + stepHeight;

      const journeyNode: Node = {
        id: journey.id,
        type: 'journey-overview-node',
        data: {
          journey,
          phases,
          steps: allSteps,
          onJourneyClick: () => handleJourneyClick(journey.id),
          onPhaseClick,
          onStepClick,
        },
        position: { x: 0, y: 0 }, // Will be positioned manually
        width: 300,
        height: calculatedHeight,
      };
      flowNodes.push(journeyNode);
    });

    // Create edges from parent steps to their subjourneys (using journeys.parent_step_id)
    // Each edge connects from the step's right handle to the subjourney's top handle
    journeys.forEach((subjourney) => {
      if (subjourney.is_subjourney && subjourney.parent_step_id) {
        const parentStepId = subjourney.parent_step_id;
        const parentJourneyId = stepIdToJourneyId.get(parentStepId);
        if (parentJourneyId) {
          const phaseColor = stepIdToPhaseColor.get(parentStepId) || '#3B82F6';
          flowEdges.push({
            id: `edge-step-${parentStepId}-subjourney-${subjourney.id}`,
            source: parentJourneyId,
            sourceHandle: `step-${parentStepId}`, // Connects from step's right handle
            target: subjourney.id,
            targetHandle: `journey-${subjourney.id}-header-left`, // Connects to subjourney header's left handle
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
      }
    });

    // Build a map of all steps by journey ID, sorted by phase sequence and step sequence order
    const journeyStepsMap = new Map<string, Step[]>();
    journeys.forEach((journey) => {
      const phases = journeyPhases[journey.id] || [];
      // Sort phases by sequence_order first
      const sortedPhases = [...phases].sort((a, b) => a.sequence_order - b.sequence_order);
      const allSteps: Step[] = [];
      sortedPhases.forEach((phase) => {
        const steps = phaseSteps[phase.id] || [];
        // Sort steps within each phase by sequence_order
        const sortedSteps = [...steps].sort((a, b) => a.sequence_order - b.sequence_order);
        allSteps.push(...sortedSteps);
      });
      journeyStepsMap.set(journey.id, allSteps);
    });

    // Get parent journeys list for finding next journey (sorted by sequence_order descending)
    const parentJourneys = journeys.filter((j) => !j.is_subjourney);
    const parentJourneysSorted = [...parentJourneys].sort((a, b) => {
      const orderA = a.sequence_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sequence_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderB - orderA; // Descending order (higher sequence_order first)
      }
      // Strict fallback: created_at descending, then id for absolute determinism
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (createdA !== createdB) {
        return createdB - createdA; // Descending order
      }
      return String(b.id).localeCompare(String(a.id)); // Descending order
    });

    // Create edges from final step of subjourneys to their continuation targets
    // Only uses continue_step_id from the database - no computed fallbacks
    journeys.forEach((subjourney) => {
      if (subjourney.is_subjourney && subjourney.parent_step_id && subjourney.continue_step_id) {
        const parentStepId = subjourney.parent_step_id;
        const parentJourneyId = stepIdToJourneyId.get(parentStepId);
        if (parentJourneyId) {
          const subjourneySteps = journeyStepsMap.get(subjourney.id) || [];

          // Find the final step in the subjourney
          const finalSubjourneyStep = subjourneySteps[subjourneySteps.length - 1];

          if (finalSubjourneyStep) {
            // Use continue_step_id directly from the database
            // Normalize to string for consistent comparison
            const continueStepId = String(subjourney.continue_step_id).trim();
            
            // Try to find the step - check both the exact ID and normalized versions
            let targetStep = stepIdToStep.get(continueStepId);
            
            // If not found, try finding by iterating (in case of type mismatch)
            if (!targetStep) {
              for (const [stepId, step] of stepIdToStep.entries()) {
                if (String(stepId).trim() === continueStepId || String(step.id).trim() === continueStepId) {
                  targetStep = step;
                  break;
                }
              }
            }
            
            // Debug logging for continue_step_id lookup
            if (!targetStep) {
              console.error(
                `[ProjectCanvas] Subjourney "${subjourney.name}" (${subjourney.id}) has continue_step_id "${continueStepId}" but step not found.`,
                {
                  continue_step_id: continueStepId,
                  continue_step_id_type: typeof subjourney.continue_step_id,
                  subjourneyName: subjourney.name,
                  totalStepsInMap: stepIdToStep.size,
                  // Find steps with similar names for debugging
                  stepsWithNames: Array.from(stepIdToStep.values())
                    .filter(s => s.name?.toLowerCase().includes('confirm') || s.name?.toLowerCase().includes('appointment'))
                    .map(s => ({ id: s.id, name: s.name })),
                }
              );
            } else {
              // Log successful match for debugging
              if (subjourney.id === 'beb6bd7c-49a1-4991-a57e-317f9240b4de') {
                console.log(
                  `[ProjectCanvas] Subjourney ${subjourney.id} continue_step_id lookup:`,
                  {
                    continue_step_id: continueStepId,
                    foundStepId: targetStep.id,
                    foundStepName: targetStep.name,
                    match: String(targetStep.id) === continueStepId,
                  }
                );
              }
            }
            
            const isReturnToParentStep = targetStep && String(targetStep.id) === String(parentStepId);

            if (targetStep) {
              const targetJourneyId = stepIdToJourneyId.get(String(targetStep.id));
              if (targetJourneyId) {
                const baseStyle = {
                  stroke: 'var(--color-connector-dashed)',
                  strokeWidth: 2,
                  strokeDasharray: '5,5',
                } as React.CSSProperties;

                const edge: Edge = {
                  id: `edge-subjourney-${subjourney.id}-final-step-to-${targetStep.id}`,
                  source: subjourney.id,
                  sourceHandle: `step-${finalSubjourneyStep.id}-left`, // Left handle of final step in subjourney
                  target: targetJourneyId,
                  targetHandle: `step-${targetStep.id}-target`, // Target handle on right side of target step
                  type: 'default',
                  style: baseStyle,
                };

                // Only show an arrow when we're moving "forward" in the flow (not returning to parent step)
                if (!isReturnToParentStep) {
                  edge.markerEnd = {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--color-connector-dashed)',
                  };
                }

                flowEdges.push(edge);
              } else {
                console.warn(
                  `[ProjectCanvas] Subjourney ${subjourney.id} target step ${targetStep.id} (${targetStep.name}) not found in stepIdToJourneyId map`
                );
              }
            }
          }
        }
      }
    });

    // Connect all consecutive top-level journeys by ascending sequence_order (1->2, 2->3, ...)
    const parentJourneysAsc = [...parentJourneys].sort((a, b) => {
      const orderA = a.sequence_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sequence_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (createdA !== createdB) {
        return createdA - createdB;
      }
      return String(a.id).localeCompare(String(b.id));
    });
    for (let i = 0; i < parentJourneysAsc.length - 1; i++) {
      const fromJourney = parentJourneysAsc[i];
      const toJourney = parentJourneysAsc[i + 1];
      if (!fromJourney || !toJourney) continue;
      flowEdges.push({
        id: `edge-journey-${fromJourney.id}-to-${toJourney.id}`,
        source: fromJourney.id,
        sourceHandle: `journey-${fromJourney.id}-bottom`, // Bottom handle of source journey
        target: toJourney.id,
        targetHandle: `journey-${toJourney.id}-top`, // Top handle of target journey
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

    // Helper function to get the parent step's sequence_order for a subjourney
    const getParentStepSequenceOrder = (subjourney: Journey): number => {
      if (!subjourney.is_subjourney || !subjourney.parent_step_id) {
        return Number.MAX_SAFE_INTEGER;
      }
      
      const parentJourneyId = stepIdToJourneyId.get(subjourney.parent_step_id);
      if (!parentJourneyId) {
        return Number.MAX_SAFE_INTEGER;
      }
      
      const parentSteps = journeyStepsMap.get(parentJourneyId) || [];
      const parentStep = parentSteps.find(step => step.id === subjourney.parent_step_id);
      
      if (!parentStep) {
        return Number.MAX_SAFE_INTEGER;
      }
      
      // Get the index of the parent step in the sorted steps array
      // This represents the sequence_order within the parent journey
      const parentStepIndex = parentSteps.findIndex(step => step.id === subjourney.parent_step_id);
      return parentStepIndex >= 0 ? parentStepIndex : Number.MAX_SAFE_INTEGER;
    };

    // Sort nodes so that:
    // 1. Top-level journeys are ordered by sequence_order (lowest first)
    // 2. Subjourneys are ordered by their parent step's sequence_order (lowest first)
    // This ensures correct ordering in all columns
    const sortedNodes = [...flowNodes].sort((a, b) => {
      const journeyA = journeys.find(j => j.id === a.id);
      const journeyB = journeys.find(j => j.id === b.id);
      
      if (!journeyA || !journeyB) {
        return 0;
      }
      
      // Both are top-level journeys - sort by sequence_order descending
      if (!journeyA.is_subjourney && !journeyB.is_subjourney) {
        const orderA = journeyA.sequence_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = journeyB.sequence_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderB - orderA; // Descending order (higher sequence_order first)
        }
        // If sequence_order is the same, fall back to name then id (descending)
        const byName = (journeyB.name || '').localeCompare(journeyA.name || '');
        if (byName !== 0) return byName;
        return String(journeyB.id).localeCompare(String(journeyA.id));
      }
      
      // Top-level journeys come before subjourneys
      if (!journeyA.is_subjourney && journeyB.is_subjourney) {
        return -1;
      }
      if (journeyA.is_subjourney && !journeyB.is_subjourney) {
        return 1;
      }
      
      // Both are subjourneys - sort by their parent step's sequence_order
      if (journeyA.is_subjourney && journeyB.is_subjourney) {
        const orderA = getParentStepSequenceOrder(journeyA);
        const orderB = getParentStepSequenceOrder(journeyB);
        
        // Sort by parent step's sequence_order (lower index = earlier step = higher in column)
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // If same parent step sequence_order, check if they have the same parent journey
        // If different parents, maintain relative order (ELK will place them in different columns)
        const parentJourneyIdA = stepIdToJourneyId.get(journeyA.parent_step_id || '');
        const parentJourneyIdB = stepIdToJourneyId.get(journeyB.parent_step_id || '');
        
        if (parentJourneyIdA !== parentJourneyIdB) {
          // Different parents - maintain relative order, ELK will handle column placement
          return 0;
        }
        
        // Same parent and same step order - fall back to name then id for deterministic ordering
        const byName = (journeyA.name || '').localeCompare(journeyB.name || '');
        if (byName !== 0) return byName;
        return String(journeyA.id).localeCompare(String(journeyB.id));
      }
      
      return 0;
    });

    return { nodes: sortedNodes, edges: flowEdges };
  }, [journeys, journeyPhases, phaseSteps, handleJourneyClick, onPhaseClick, onStepClick, project.id, onImportJourney, onCreateJourney]);

  // Apply ELK.js layout to nodes
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    if (rawNodes.length === 0) {
      setNodes([]);
      return;
    }

    // Apply ELK layout - Left to Right hierarchical tree layout
    // Only use hierarchy edges (parent journey to subjourney) to maintain proper tree structure
    // Sequential edges and continuation edges are excluded from layout to prevent cycles
    // They are still rendered visually but don't affect node positioning
    const layoutEdges = edges.filter((edge) => {
      // Only include edges that connect parent journeys to their subjourneys (tree hierarchy)
      // These edges go from left (parent) to right (child), maintaining tree structure
      return edge.type === 'step-to-subjourney' || 
             (edge.id.startsWith('edge-step-') && edge.id.includes('-subjourney-'));
    });

    // Identify main journeys (non-subjourneys) to force them to layer 0
    const mainJourneyIds = new Set<string>(
      journeys.filter(j => !j.is_subjourney).map(j => j.id)
    );

    // Build sequence_order map for all journeys to enforce order
    // This ensures ELK respects the sequence_order from the database
    // For descending order: we'll invert the priority in layout.ts
    const nodeSequenceOrder = new Map<string, number>();
    const journeysWithOrder = journeys.filter(j => j.sequence_order !== undefined && j.sequence_order !== null);
    const maxSequenceOrder = journeysWithOrder.length > 0
      ? Math.max(...journeysWithOrder.map(j => j.sequence_order!))
      : 0;
    journeys.forEach((journey) => {
      if (journey.sequence_order !== undefined && journey.sequence_order !== null) {
        // Store inverted sequence_order for descending display
        // Higher sequence_order should appear first, so we invert it
        nodeSequenceOrder.set(journey.id, maxSequenceOrder - journey.sequence_order + 1);
      }
    });

    applyElkLayout(rawNodes, layoutEdges, {
      direction: 'LR', // Left to Right
      nodeSep, // Vertical spacing between nodes in same column
      rankSep, // Horizontal spacing between columns (levels)
      marginX: 50,
      marginY: 50,
      preferDomMeasurements: false, // Use node.width/height for stability
      nodeSequenceOrder, // Pass sequence_order map to enforce order
    }, mainJourneyIds)
      .then((layouted) => {
        // Post-process: Add extra vertical spacing between rows
        // Each row consists of a main journey and all its descendants (subjourneys at any level)
        // This ensures proper spacing between complete journey hierarchies
        const processedNodes = addSpacingBetweenRows(
          layouted.nodes,
          journeys,
          rowSep
        );
        setNodes(processedNodes);
      })
      .catch((error) => {
        console.error('ELK layout error:', error);
        // Fallback to raw nodes if layout fails
        setNodes(rawNodes);
      });
  }, [rawNodes, edges, nodeSep, rankSep, rowSep, journeys, addSpacingBetweenRows]);


  const onNodesChange: OnNodesChange = useCallback((_changes) => {
    // Handle node changes (position updates, etc.)
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((_changes) => {
    // Handle edge changes
  }, []);

  const onConnect: OnConnect = useCallback((_connection) => {
    // TODO: Handle new edge creation
  }, []);

  // Clear selection when clicking on canvas background
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      if (node.type === 'journey-overview-node') {
        // Check if the click target is the header (don't select or navigate if it is - header handles its own click)
        const target = event.target as HTMLElement;
        const isHeaderClick = target.closest('[data-journey-header]') !== null;
        
        // If clicking the header, don't do anything - let the header's onClick handle it
        if (isHeaderClick) {
          return;
        }
        
        // For non-header clicks, select the journey
        select('selectedJourney', node.id);
      }
    },
    [select]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.1, includeHiddenNodes: true }}
      proOptions={proOptions}
      minZoom={0.1}
      maxZoom={1.2}
      attributionPosition="bottom-left"
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={[1]}
    >
      <Background color={backgroundDotColor || defaultDotColor} />
      <Controls />
      <MiniMap
      maskColor="#202020"
      nodeColor="#404040"
  className="my-minimap"
  style={{
    backgroundColor: 'var(--surface-2)',
    borderRadius: 24,
    height: 140,
    width: 200,
  }}
/>
      
      {/* Spacing Control Panel - Bottom Left (next to React Flow controls) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '60px', // Position to the right of React Flow controls (which are typically ~40px wide)
          background: 'var(--surface-2)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: isMinimized ? '8px 8px 8px 8px' : '12px 12px 12px 12px',
          paddingTop: isMinimized ? '24px' : '28px', // Extra space at top for collapse icon
          boxShadow: 'var(--shadow-md)',
          zIndex: 10,
          minWidth: isMinimized ? '180px' : '220px',
        }}
      >
        {/* Minimize/Maximize Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? '▼' : '▲'}
        </button>

        <div style={{ marginBottom: isMinimized ? '6px' : '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isMinimized ? (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                minWidth: '12px',
              }}
            >
              y
            </span>
          ) : (
            <label
              htmlFor="nodeSep-slider"
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Vertical: {nodeSep}px
            </label>
          )}
          <input
            id="nodeSep-slider"
            type="range"
            min="20"
            max="200"
            step="10"
            value={nodeSep}
            onChange={(e) => setNodeSep(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>
        <div style={{ marginBottom: isMinimized ? '6px' : '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isMinimized ? (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                minWidth: '12px',
              }}
            >
              x
            </span>
          ) : (
            <label
              htmlFor="rankSep-slider"
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Horizontal: {rankSep}px
            </label>
          )}
          <input
            id="rankSep-slider"
            type="range"
            min="50"
            max="400"
            step="10"
            value={rankSep}
            onChange={(e) => setRankSep(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isMinimized ? (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                minWidth: '12px',
              }}
            >
              r
            </span>
          ) : (
            <label
              htmlFor="rowSep-slider"
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Row Gap: {rowSep}px
            </label>
          )}
          <input
            id="rowSep-slider"
            type="range"
            min="40"
            max="800"
            step="20"
            value={rowSep}
            onChange={(e) => setRowSep(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>
      </div>
    </ReactFlow>
  );
}

export function ProjectCanvas(props: ProjectCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100vh' }}>
        <ProjectCanvasInner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
