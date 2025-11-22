/**
 * Canvas components exports
 */

export { JourneyCanvas } from './JourneyCanvas';
export { JourneyNode } from './JourneyNode';
export { JourneyOverviewNode } from './JourneyOverviewNode';
export { ProjectCanvas } from './ProjectCanvas';
// Note: Dagre layout functions removed - JourneyCanvas.tsx and layout.ts still reference dagre internally
// but are no longer exported. These will need to be updated to remove dagre dependency.

