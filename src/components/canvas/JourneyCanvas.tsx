/**
 * Journey Canvas Component
 * Main React Flow canvas for rendering journeys with Dagre layout
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesInitialized,
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
  'journey-node': JourneyNode,
};

const proOptions = { hideAttribution: true };

/**
 * Inner canvas component that uses React Flow hooks
 */
function JourneyCanvasInner({ journeyId }: { journeyId: string }) {
  const { currentJourney, setCurrentJourney } = useAppStore();
  const { clearSelection } = useSelection();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const fitViewCalledRef = useRef(false);

  // Load journey on mount
  useEffect(() => {
    if (journeyId) {
      // Reset fitView flag when journey changes
      fitViewCalledRef.current = false;
      
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
      fitViewCalledRef.current = false;
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

  // Fit view when nodes are initialized and measured
  // Wait for nodes to be initialized, then give ResizeObserver time to measure
  useEffect(() => {
    if (nodes.length > 0 && nodesInitialized && !fitViewCalledRef.current) {
      // Give ResizeObserver time to measure node sizes (initial delay + measurement)
      // useJourneySizeMeasurement has 50ms initial delay, plus ResizeObserver needs time
      const timer = setTimeout(() => {
        fitView({ padding: 0.2 });
        fitViewCalledRef.current = true;
      }, 200); // Increased delay to ensure measurements are complete

      return () => clearTimeout(timer);
    }
  }, [nodes.length, nodesInitialized, fitView]);


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
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

/**
 * Journey Canvas - Main canvas component with React Flow provider
 */
export function JourneyCanvas({ journeyId }: { journeyId: string }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100vh' }}>
        <JourneyCanvasInner journeyId={journeyId} />
      </div>
    </ReactFlowProvider>
  );
}

