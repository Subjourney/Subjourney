/**
 * Project Canvas Component
 * Main React Flow canvas for rendering journey overview nodes directly
 */

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { JourneyOverviewNode } from './JourneyOverviewNode';
import { StepToSubjourneyEdge } from './StepToSubjourneyEdge';
import { useSelection } from '../../store';
import type { Project, Journey, Phase, Step } from '../../types';
import { useNavigate } from 'react-router-dom';

const nodeTypes = {
  'journey-overview-node': JourneyOverviewNode,
};

const edgeTypes = {
  'step-to-subjourney': StepToSubjourneyEdge,
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
}: ProjectCanvasInnerProps) {
  const { clearSelection, select } = useSelection();
  const { fitView } = useReactFlow();
  const navigate = useNavigate();

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

    // Build a map from stepId -> parentJourneyId and stepId -> phase color
    const stepIdToJourneyId = new Map<string, string>();
    const stepIdToPhaseColor = new Map<string, string>();
    journeys.forEach((journey) => {
      const phases = journeyPhases[journey.id] || [];
      phases.forEach((phase) => {
        const steps = phaseSteps[phase.id] || [];
        steps.forEach((step) => {
          stepIdToJourneyId.set(step.id, journey.id);
          stepIdToPhaseColor.set(step.id, phase.color || '#3B82F6');
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

    // Create edges from final step of subjourneys to next sequential step in parent journey
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
          const parentStepIndex = parentSteps.findIndex(step => step.id === parentStepId);
          
          // Find the next sequential step after the parent step
          if (finalSubjourneyStep && parentStepIndex >= 0 && parentStepIndex < parentSteps.length - 1) {
            const nextStep = parentSteps[parentStepIndex + 1];
            
            flowEdges.push({
              id: `edge-subjourney-${subjourney.id}-final-step-to-${nextStep.id}`,
              source: subjourney.id,
              sourceHandle: `step-${finalSubjourneyStep.id}-left`, // Left handle of final step in subjourney
              target: parentJourneyId,
              targetHandle: `step-${nextStep.id}-target`, // Target handle on right side of next step in parent
              type: 'default', // Use smoothstep instead of custom edge to get correct handle positions
              style: {
                stroke: '#6B7280',
                strokeWidth: 2,
                strokeDasharray: '5,5',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#6B7280',
              },
            });
          }
        }
      }
    });

    // Create edges connecting top-level journeys in sequence
    // Connect bottom of each journey to top of the next one
    const parentJourneys = journeys.filter((j) => !j.is_subjourney);
    for (let i = 0; i < parentJourneys.length - 1; i++) {
      const currentJourney = parentJourneys[i];
      const nextJourney = parentJourneys[i + 1];
      flowEdges.push({
        id: `edge-journey-${currentJourney.id}-to-${nextJourney.id}`,
        source: currentJourney.id,
        sourceHandle: `journey-${currentJourney.id}-bottom`, // Bottom handle of current journey
        target: nextJourney.id,
        targetHandle: `journey-${nextJourney.id}-top`, // Top handle of next journey
        type: 'smoothstep',
        style: {
          stroke: '#6B7280',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6B7280',
        },
      });
    }

    // ---- Custom layout: place subjourneys to the right of their parent and stack vertically ----
    // Build quick lookup for nodes by journey id
    const nodeById = new Map<string, Node>();
    flowNodes.forEach((n) => nodeById.set(n.id, n));

    // Group subjourney nodes by their parent journey id
    const parentToSubNodes = new Map<string, Node[]>();
    journeys.forEach((j) => {
      if (j.is_subjourney && j.parent_step_id) {
        const parentJourneyId = stepIdToJourneyId.get(j.parent_step_id);
        if (parentJourneyId) {
          const subNode = nodeById.get(j.id);
          if (subNode) {
            const arr = parentToSubNodes.get(parentJourneyId) || [];
            arr.push(subNode);
            parentToSubNodes.set(parentJourneyId, arr);
          }
        }
      }
    });

    // Layout params
    const marginX = 50;
    const marginY = 50;
    const horizontalGap = 120;
    const verticalGap = 40;
    const blockGap = 80; // gap between different parent blocks

    // Order parents as they appear (already filtered above)

    let currentY = marginY;
    parentJourneys.forEach((parent) => {
      const parentNode = nodeById.get(parent.id);
      if (!parentNode) return;

      // Parent position (left column)
      parentNode.position = { x: marginX, y: currentY };

      const subNodes = parentToSubNodes.get(parent.id) || [];

      // Place subjourneys to the right, stacked vertically
      const parentRightX = (parentNode.position?.x || 0) + (parentNode.width || 300);
      let subCurrentY = parentNode.position.y;
      subNodes.forEach((sn) => {
        sn.position = {
          x: parentRightX + horizontalGap,
          y: subCurrentY,
        };
        subCurrentY += (sn.height || 250) + verticalGap;
      });

      // Advance Y for next parent block - consider tallest of parent vs subjourney stack
      const parentHeight = parentNode.height || 300;
      const subsTotalHeight =
        subNodes.reduce((sum, sn, idx) => sum + (sn.height || 250) + (idx > 0 ? verticalGap : 0), 0) || 0;
      const blockHeight = Math.max(parentHeight, subsTotalHeight);
      currentY += blockHeight + blockGap;
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [journeys, journeyPhases, phaseSteps, handleJourneyClick, onPhaseClick, onStepClick]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [nodes.length, fitView]);

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
      proOptions={proOptions}
      minZoom={0.1}
      maxZoom={1.2}
      attributionPosition="bottom-left"
    >
      <Background />
      <Controls />
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
