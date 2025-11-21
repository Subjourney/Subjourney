/**
 * Dagre layout utilities for positioning journey nodes
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSep?: number;
  rankSep?: number;
  marginX?: number;
  marginY?: number;
  /**
   * When true (default), try to read actual DOM-measured sizes via data attributes.
   * When false, rely solely on node.width/node.height passed in.
   */
  preferDomMeasurements?: boolean;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeSep: 50,
  rankSep: 100,
  marginX: 50,
  marginY: 50,
  preferDomMeasurements: true,
};

/**
 * Apply Dagre layout to nodes and edges
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
    marginx: opts.marginX,
    marginy: opts.marginY,
  });

  // Add nodes with their actual sizes
  // Use React Flow's node dimensions first (set by updateNodeInternals)
  // Fall back to data attributes if needed, then defaults
  nodes.forEach((node) => {
    let width = node.width || 400;
    let height = node.height || 300;

    // Prefer zoom-independent sizes from data attributes if available
    if (opts.preferDomMeasurements && node.data) {
      // Use a single query with a more specific selector
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

    graph.setNode(node.id, { width, height });
  });

  // Add edges
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(graph);

  // Update node positions from Dagre results
  // Use the same sizes we calculated when adding nodes to the graph
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = graph.node(node.id);
    if (!dagreNode) return node;

    // Use the same size calculation as when adding to graph
    let nodeWidth = node.width || 400;
    let nodeHeight = node.height || 300;
    
    // Prefer zoom-independent sizes from data attributes if available
    if (opts.preferDomMeasurements && node.data) {
      const nodeElement = document.querySelector(
        `[data-journey-id="${node.id}"], [data-project-id="${node.id}"]`
      );
      if (nodeElement) {
        const measuredWidth = nodeElement.getAttribute('data-width');
        const measuredHeight = nodeElement.getAttribute('data-height');
        if (measuredWidth) nodeWidth = parseInt(measuredWidth, 10);
        if (measuredHeight) nodeHeight = parseInt(measuredHeight, 10);
      }
    }

    // Convert Dagre's center position to top-left position
    const x = dagreNode.x - nodeWidth / 2;
    const y = dagreNode.y - nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Layout children within a parent container
 * Used for positioning journey overview nodes within project containers
 */
export function layoutChildrenWithinContainer(
  parentNode: Node,
  childNodes: Node[],
  options: LayoutOptions = {}
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

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const childGraph = new dagre.graphlib.Graph();
  childGraph.setDefaultEdgeLabel(() => ({}));
  childGraph.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
    marginx: opts.marginX,
    marginy: opts.marginY,
  });

  // Add child nodes with their dimensions
  childNodes.forEach((node) => {
    // Try to get measured size from DOM
    let width = node.width || 300;
    let height = node.height || 250;

    // Check for journey overview node
    if (node.data && 'journey' in node.data) {
      const nodeElement = document.querySelector(
        `[data-journey-id="${node.id}"]`
      );
      if (nodeElement) {
        const measuredWidth = nodeElement.getAttribute('data-width');
        const measuredHeight = nodeElement.getAttribute('data-height');
        if (measuredWidth) width = parseInt(measuredWidth, 10);
        if (measuredHeight) height = parseInt(measuredHeight, 10);
      }
    }

    childGraph.setNode(node.id, { width, height });
  });

  // Add edges between children (if any)
  // For now, no edges between journey overview nodes

  dagre.layout(childGraph);

  // Calculate required container size
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const containerPadding = opts.marginX; // Padding inside container

  const layoutedChildren = childNodes.map((node) => {
    const dagreNode = childGraph.node(node.id);
    if (!dagreNode) return node;

    // Get actual node size
    let nodeWidth = node.width || 300;
    let nodeHeight = node.height || 250;

    if (node.data && 'journey' in node.data) {
      const nodeElement = document.querySelector(
        `[data-journey-id="${node.id}"]`
      );
      if (nodeElement) {
        const measuredWidth = nodeElement.getAttribute('data-width');
        const measuredHeight = nodeElement.getAttribute('data-height');
        if (measuredWidth) nodeWidth = parseInt(measuredWidth, 10);
        if (measuredHeight) nodeHeight = parseInt(measuredHeight, 10);
      }
    }

    // Convert Dagre's center position to top-left position
    // Positions are relative to the parent container (0,0 is top-left of parent)
    const x = dagreNode.x - nodeWidth / 2 - opts.marginX + containerPadding;
    const y = dagreNode.y - nodeHeight / 2 - opts.marginY + containerPadding;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + nodeWidth);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + nodeHeight);

    return {
      ...node,
      position: { x, y },
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  // Calculate container size based on actual children bounds plus padding
  const childrenWidth = maxX - minX;
  const childrenHeight = maxY - minY;
  const containerWidth = childrenWidth + containerPadding * 2;
  const containerHeight = childrenHeight + containerPadding * 2;

  return {
    nodes: layoutedChildren,
    parentSize: {
      width: Math.max(containerWidth, parentNode.width || 400),
      height: Math.max(containerHeight, parentNode.height || 300),
    },
  };
}

