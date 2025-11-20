/**
 * Journey Canvas Component
 * Main React Flow canvas for rendering journeys with Dagre layout
 */

import { useCallback, useEffect, useMemo, memo } from 'react';
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
import { useAppStore } from '../../store';
import { useSelection } from '../../store';
import { journeysApi } from '../../api';

const nodeTypes = {
  'journey-node': memo(JourneyNode),
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
        .then((journey) => {
          setCurrentJourney(journey);
        })
        .catch((error) => {
          console.error('Failed to load journey:', error);
        });
    } else {
      // Clear journey if no journeyId
      setCurrentJourney(null);
    }

    // Cleanup: Clear journey when component unmounts
    return () => {
      setCurrentJourney(null);
    };
  }, [journeyId, setCurrentJourney]);

  // Convert journey data to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!currentJourney) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Create node for main journey
    flowNodes.push({
      id: currentJourney.id,
      type: 'journey-node',
      data: { journey: currentJourney },
      position: { x: 0, y: 0 }, // Will be positioned by Dagre
    });

    // Create nodes for subjourneys
    if (currentJourney.subjourneys) {
      currentJourney.subjourneys.forEach((subjourney) => {
        flowNodes.push({
          id: subjourney.id,
          type: 'journey-node',
          data: { journey: subjourney },
          position: { x: 0, y: 0 }, // Will be positioned by Dagre
        });

        // Create edge from parent step to subjourney
        // The edge connects from the step handle (inside the journey node) to the subjourney
        if (subjourney.parent_step_id) {
          flowEdges.push({
            id: `edge-${subjourney.parent_step_id}-${subjourney.id}`,
            source: currentJourney.id,
            sourceHandle: `step-${subjourney.parent_step_id}`,
            target: subjourney.id,
            targetHandle: 'top',
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
  }, [currentJourney]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [nodes.length, fitView]);


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

