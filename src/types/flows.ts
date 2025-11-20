/**
 * Flow system types
 * Flows represent sequences of steps across journeys
 */

import type { EntityId, Timestamp, TeamScopedEntity, BaseEntity } from './common';

/**
 * Flow - Sequence of steps that demonstrate a specific path
 */
export interface Flow extends TeamScopedEntity {
  project_id: EntityId;
  name: string;
  description?: string;
  is_ai_generated: boolean;
}

/**
 * Flow Step - Junction table linking flows to steps with ordering
 */
export interface FlowStep extends BaseEntity {
  flow_id: EntityId;
  step_id: EntityId;
  sequence_order: number; // Order of step within the flow (1-based)
}

