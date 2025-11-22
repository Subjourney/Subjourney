/**
 * ELK.js layout utilities for positioning journey nodes
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSep?: number;
  rankSep?: number;
  rowSep?: number; // Spacing between rows (main journeys and their descendants)
  marginX?: number;
  marginY?: number;
  preferDomMeasurements?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<LayoutOptions, 'rowSep'>> & { rowSep?: number } = {
  direction: 'TB',
  nodeSep: 50,
  rankSep: 100,
  rowSep: undefined, // Optional - only used when edges are marked for row spacing
  marginX: 50,
  marginY: 50,
  preferDomMeasurements: true,
};

// Create ELK instance
const elk = new ELK();

/**
 * Convert React Flow nodes and edges to ELK graph format
 */
function convertToElkGraph(
  nodes: Node[],
  edges: Edge[],
  options: Required<Omit<LayoutOptions, 'rowSep'>> & { rowSep?: number },
  mainJourneyIds?: Set<string>
): ElkNode {
  const children: ElkNode[] = nodes.map((node) => {
    let width = node.width || 300;
    let height = node.height || 250;

    // Prefer zoom-independent sizes from data attributes if available
    if (options.preferDomMeasurements && node.data) {
      const nodeElement = document.querySelector(
        `[data-journey-id="${node.id}"], [data-project-id="${node.id}"]`
      );
      if (nodeElement) {
        const measuredWidth = nodeElement.getAttribute('data-width');
        const measuredHeight = nodeElement.getAttribute('data-height');
        if (measuredWidth) width = parseInt(measuredWidth, 10);
        if (measuredHeight) height = parseInt(measuredHeight, 10);
      }
    }

    const elkNode: ElkNode = {
      id: String(node.id),
      width,
      height,
    };

    // Force main journeys to layer 0 (leftmost) by setting high priority
    // Higher priority nodes are placed earlier in the layout
    if (mainJourneyIds && mainJourneyIds.has(String(node.id))) {
      elkNode.layoutOptions = {
        'elk.priority': '10', // High priority to ensure they're in first layer
        'elk.layered.crossingMinimization.positionChoice.strategy': 'NODES',
      };
    }

    return elkNode;
  });

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => {
    const elkEdge: ElkExtendedEdge = {
      id: edge.id,
      sources: [String(edge.source)],
      targets: [String(edge.target)],
    };
    
    // All edges in layout should be tree edges (parent to child)
    // No special handling needed - ELK will position them correctly in tree structure
    // Sequential edges and continuation edges are excluded from layout
    
    return elkEdge;
  });

  // Map direction to ELK direction
  const elkDirection = options.direction === 'TB' ? 'DOWN' : 
                       options.direction === 'LR' ? 'RIGHT' :
                       options.direction === 'BT' ? 'UP' : 'LEFT';

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection,
      'elk.spacing.nodeNode': String(options.nodeSep),
      'elk.spacing.edgeNode': String(options.nodeSep),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(options.rankSep),
      'elk.layered.nodePlacement.strategy': 'SIMPLE', // Simple placement for cleaner tree hierarchy
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', // Minimize edge crossings
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true', // Force ELK to respect the order of nodes in the array
      'elk.considerModelOrder.strategy': 'NODES_AND_EDGES', // Respect the order of nodes in the array
      // Tree-specific optimizations
      'elk.layered.cycleBreaking.strategy': 'GREEDY', // Break any cycles (shouldn't exist in trees, but safety)
      'elk.layered.layering.strategy': 'INTERACTIVE', // Good for tree structures
      'elk.padding': `[left=${options.marginX}, top=${options.marginY}, right=${options.marginX}, bottom=${options.marginY}]`,
    },
    children,
    edges: elkEdges,
  };
}

/**
 * Apply ELK.js layout to nodes and edges
 */
export async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
  mainJourneyIds?: Set<string>
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Convert to ELK graph format
  const elkGraph = convertToElkGraph(nodes, edges, opts, mainJourneyIds);

  // Run ELK layout
  const layoutedGraph = await elk.layout(elkGraph);

  // Update node positions from ELK results
  const layoutedNodes = nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === String(node.id));
    if (!elkNode || elkNode.x === undefined || elkNode.y === undefined) {
      return node;
    }

    return {
      ...node,
      position: {
        x: elkNode.x,
        y: elkNode.y,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Stub implementation for backward compatibility
 * TODO: Remove once all callers are updated to use applyElkLayout
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  _options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  // Return nodes unchanged - manual positioning should be done in the component
  return { nodes, edges };
}

/**
 * Stub implementation for backward compatibility
 * TODO: Remove once all callers are updated
 */
export function layoutChildrenWithinContainer(
  parentNode: Node,
  childNodes: Node[],
  _options: LayoutOptions = {}
): { nodes: Node[]; parentSize: { width: number; height: number } } {
  if (childNodes.length === 0) {
    return {
      nodes: [],
      parentSize: {
        width: parentNode.width || 400,
        height: parentNode.height || 300,
      },
    };
  }

  // Return nodes unchanged - manual positioning should be done in the component
  return {
    nodes: childNodes,
    parentSize: {
      width: parentNode.width || 400,
      height: parentNode.height || 300,
    },
  };
}
