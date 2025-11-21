/**
 * Project Canvas Component
 * Main React Flow canvas for rendering journey overview nodes directly
 */

import { useCallback, useMemo, memo } from 'react';
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
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { applyDagreLayout } from './layout';
import { useSelection } from '../../store';
import type { Project, Journey, Phase, Step } from '../../types';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  'journey-overview-node': memo(JourneyOverviewNode),
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
  backgroundDotColor, // Color for canvas background dots (defaults to CSS variable)
}: ProjectCanvasInnerProps) {
  const { clearSelection, select } = useSelection();
  const navigate = useNavigate();

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
      select('selectedJourney', journeyId);
      if (onJourneyClick) {
        onJourneyClick(journeyId);
      } else {
        navigate(`/${teamSlug}/project/${project.id}/journey/${journeyId}`);
      }
    },
    [select, onJourneyClick, navigate, teamSlug, project.id]
  );

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

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
        position: { x: 0, y: 0 }, // Will be positioned by Dagre
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

    // Get parent journeys list for finding next journey (sorted deterministically by name then id)
    const parentJourneys = journeys.filter((j) => !j.is_subjourney);
    const parentJourneysSorted = [...parentJourneys].sort((a, b) => {
      const byName = (a.name || '').localeCompare(b.name || '');
      if (byName !== 0) return byName;
      return String(a.id).localeCompare(String(b.id));
    });

    // Create edges from final step of subjourneys to their continuation targets
    // Default: next sequential step after the parent step
    // Edge case: if parent step is last in a subjourney, "return" to the parent step of the parent subjourney (no arrow)
    journeys.forEach((subjourney) => {
      if (subjourney.is_subjourney && subjourney.parent_step_id) {
        const parentStepId = subjourney.parent_step_id;
        const parentJourneyId = stepIdToJourneyId.get(parentStepId);
        if (parentJourneyId) {
          const subjourneySteps = journeyStepsMap.get(subjourney.id) || [];
          const parentSteps = journeyStepsMap.get(parentJourneyId) || [];

          // Find the final step in the subjourney
          const finalSubjourneyStep = subjourneySteps[subjourneySteps.length - 1];

          // Find the parent step and get its index
          const parentStepIndex = parentSteps.findIndex((step) => step.id === parentStepId);

          if (finalSubjourneyStep && parentStepIndex >= 0) {
            let targetStep: Step | undefined;
            let isReturnToParentStep = false;

            // Case 0: Explicit continuation via continue_step_id (if provided)
            if (subjourney.continue_step_id) {
              targetStep = stepIdToStep.get(subjourney.continue_step_id);
            }

            // Case 1: There's a next step in the parent journey
            if (!targetStep && parentStepIndex < parentSteps.length - 1) {
              targetStep = parentSteps[parentStepIndex + 1];
            }

            // Case 2: Parent step is the last step AND parent journey is itself a subjourney.
            // In this scenario, "return" to the parent step *within the base/parent subjourney* (no arrow).
            if (!targetStep) {
              const parentJourney = journeyIdToJourney.get(parentJourneyId);
              if (parentJourney?.is_subjourney) {
                targetStep = parentSteps[parentStepIndex];
                isReturnToParentStep = true;
              }
            }

            // Case 3: Fallback - parent step is last and parent journey is top-level.
            // Keep existing behaviour: connect to first step of next top-level journey.
            if (!targetStep) {
              const parentJourneyIndex = parentJourneysSorted.findIndex((j) => j.id === parentJourneyId);
              if (parentJourneyIndex >= 0 && parentJourneyIndex < parentJourneysSorted.length - 1) {
                const nextJourney = parentJourneysSorted[parentJourneyIndex + 1];
                const nextJourneySteps = journeyStepsMap.get(nextJourney.id) || [];
                const firstStepOfNextJourney = nextJourneySteps[0];
                if (firstStepOfNextJourney) {
                  targetStep = firstStepOfNextJourney;
                }
              }
            }

            if (targetStep) {
              const targetJourneyId = stepIdToJourneyId.get(targetStep.id);
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

                // Only show an arrow when we're moving "forward" in the flow.
                if (!isReturnToParentStep) {
                  edge.markerEnd = {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--color-connector-dashed)',
                  };
                }

                flowEdges.push(edge);
              }
            }
          }
        }
      }
    });

    // Create edges connecting top-level journeys in sequence
    // Connect bottom of each journey to top of the next one
    // (use sorted parent journeys for deterministic sequence)
    for (let i = 0; i < parentJourneysSorted.length - 1; i++) {
      const currentJourney = parentJourneysSorted[i];
      const nextJourney = parentJourneysSorted[i + 1];
      flowEdges.push({
        id: `edge-journey-${currentJourney.id}-to-${nextJourney.id}`,
        source: currentJourney.id,
        sourceHandle: `journey-${currentJourney.id}-bottom`, // Bottom handle of current journey
        target: nextJourney.id,
        targetHandle: `journey-${nextJourney.id}-top`, // Top handle of next journey
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

    // ---- Custom layout: place subjourneys to the right of their parent and stack vertically ----
    // Build quick lookup for nodes by journey id
    const nodeById = new Map<string, Node>();
    flowNodes.forEach((n) => nodeById.set(n.id, n));

    // Group subjourney nodes by their parent journey id, keeping the parent step order
    const parentToSubNodes = new Map<string, Array<{ node: Node; parentStepIndex: number }>>();
    journeys.forEach((j) => {
      if (j.is_subjourney && j.parent_step_id) {
        const parentJourneyId = stepIdToJourneyId.get(j.parent_step_id);
        if (parentJourneyId) {
          const subNode = nodeById.get(j.id);
          if (subNode) {
            const parentSteps = journeyStepsMap.get(parentJourneyId) || [];
            const idx = parentSteps.findIndex((s) => s.id === j.parent_step_id);
            const arr = parentToSubNodes.get(parentJourneyId) || [];
            arr.push({ node: subNode, parentStepIndex: idx >= 0 ? idx : Number.MAX_SAFE_INTEGER });
            parentToSubNodes.set(parentJourneyId, arr);
          }
        }
      }
    });

    // Layout params - reduced vertical spacing
    const marginX = 50;
    const marginY = 50;
    const horizontalGap = 100;
    const verticalGap = 60; // Reduced from 40

    // Use Dagre layout for parent journeys (zoom-compensated rank separation)
    // Create temporary edges between parent journeys for Dagre layout
    const parentJourneyEdges: Edge[] = [];
    for (let i = 0; i < parentJourneysSorted.length - 1; i++) {
      parentJourneyEdges.push({
        id: `temp-edge-${parentJourneysSorted[i].id}-${parentJourneysSorted[i + 1].id}`,
        source: parentJourneysSorted[i].id,
        target: parentJourneysSorted[i + 1].id,
      });
    }

    // Get parent journey nodes only
    const parentJourneyNodes = parentJourneysSorted
      .map((j) => nodeById.get(j.id))
      .filter((n): n is Node => n !== undefined);

    // Apply Dagre layout to parent journeys with zoom-compensated rank separation
    const layoutedParentNodes = applyDagreLayout(parentJourneyNodes, parentJourneyEdges, {
      direction: 'TB',
      nodeSep: 50,
      rankSep: 260, // Reduced vertical separation (zoom-compensated via data attributes)
      marginX,
      marginY,
      // For project canvas, rely on node.width/height only for stability
      preferDomMeasurements: false,
    });

    // Update parent node positions from Dagre layout
    layoutedParentNodes.nodes.forEach((layoutedNode) => {
      const originalNode = nodeById.get(layoutedNode.id);
      if (originalNode) {
        originalNode.position = layoutedNode.position;
      }
    });

    // Helper function: get size from node props only (no DOM)
    const getNodeSize = (node: Node): { width: number; height: number } => {
      return {
        width: node.width || 300,
        height: node.height || 250,
      };
    };

    // Recursive positioning of subjourneys for any parent (supports nested subjourneys)
    const positionSubjourneysRecursive = (parentNode: Node, parentJourneyId: string) => {
      const parentSize = getNodeSize(parentNode);
      const subNodesWithIndex = parentToSubNodes.get(parentJourneyId) || [];
      if (subNodesWithIndex.length === 0) return;

      // Sort subjourneys by their parent step's order
      const sortedSubNodes = [...subNodesWithIndex].sort((a, b) => a.parentStepIndex - b.parentStepIndex);

      // X position for direct children of this parent
      const parentRightX = (parentNode.position?.x || 0) + parentSize.width;

      // Compute total height of subjourney stack to center relative to this parent (using measured sizes)
      const subsTotalHeightForCentering =
        sortedSubNodes.reduce(
          (sum, { node: sn }, idx) => {
            const subSize = getNodeSize(sn);
            return sum + subSize.height + (idx > 0 ? verticalGap : 0);
          },
          0
        ) || 0;

      const parentCenterY = (parentNode.position?.y || 0) + parentSize.height / 2;
      let subCurrentY =
        subsTotalHeightForCentering > 0
          ? parentCenterY - subsTotalHeightForCentering / 2
          : (parentNode.position?.y || 0);

      // Place direct children
      sortedSubNodes.forEach(({ node: sn }) => {
        const subSize = getNodeSize(sn);
        sn.position = {
          x: parentRightX + horizontalGap,
          y: subCurrentY,
        };
        subCurrentY += subSize.height + verticalGap;

        // Recurse to place grandchildren to the right of this subjourney
        positionSubjourneysRecursive(sn, String(sn.id));
      });
    };

    // Position subjourneys for each top-level parent; recursion handles deeper levels
    parentJourneysSorted.forEach((parent) => {
      const parentNode = nodeById.get(parent.id);
      if (parentNode) {
        positionSubjourneysRecursive(parentNode, parent.id);
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [journeys, journeyPhases, phaseSteps, handleJourneyClick, onPhaseClick, onStepClick]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // Handle node changes (position updates, etc.)
    console.log('Nodes changed:', changes);
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    // Handle edge changes
    console.log('Edges changed:', changes);
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    console.log('Edge connected:', connection);
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
        select('selectedJourney', node.id);
        if (onJourneyClick) {
          onJourneyClick(node.id);
        } else {
          navigate(`/${teamSlug}/project/${project.id}/journey/${node.id}`);
        }
      }
    },
    [navigate, project.id, select, teamSlug, onJourneyClick]
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
      fitViewOptions={{ padding: 0.25, includeHiddenNodes: true }}
      proOptions={proOptions}
      minZoom={0.1}
      maxZoom={2}
      attributionPosition="bottom-left"
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={[1]}
    >
      <Background color={backgroundDotColor || defaultDotColor} />
      <Controls />
      <MiniMap></MiniMap>
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
