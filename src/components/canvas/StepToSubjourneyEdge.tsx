/**
 * Custom edge from a parent step (inside JourneyOverviewNode) to a subjourney node
 * Uses a bezier path and respects edge styling
 */

import { BaseEdge, getBezierPath, type EdgeProps, Position } from '@xyflow/react';

export function StepToSubjourneyEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Right,
    targetPosition = Position.Left,
    style,
    markerEnd,
    markerStart,
  } = props;

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ strokeWidth: 2, ...style }}
      markerEnd={markerEnd}
      markerStart={markerStart}
    />
  );
}


