/**
 * Store type definitions
 */

import type {
  EntityId,
  Journey,
  Phase,
  Step,
  Card,
  Attribute,
  Flow,
} from '../types';

/**
 * Selection state
 */
export interface SelectionState {
  selectedStep: EntityId | null;
  selectedPhase: EntityId | null;
  selectedJourney: EntityId | null;
  selectedProject: EntityId | null;
  selectedAttribute: EntityId | null;
  selectedFirstAttributeType: EntityId | null;
  selectedCard: EntityId | null;
  selectedFlow: EntityId | null;
}

/**
 * UI state
 */
export interface UIState {
  editingActive: boolean;
  collapsedSubjourneys: Set<EntityId>;
  loadingSteps: Set<EntityId>;
  loadingSubjourneys: Set<EntityId>;
  disableHover: boolean;
  isServiceBlueprintOpen: boolean;
  draggedBlueprintItem: unknown | null;
  isCenterWhenClicked: boolean;
}

/**
 * Data state
 */
export interface DataState {
  currentJourney: Journey | null;
  phases: Phase[];
  steps: Step[];
  cards: Card[];
  attributes: Attribute[];
  flows: Flow[];
}

/**
 * Selection options
 */
export interface SelectOptions {
  immediate?: boolean;
  source?: string;
}

/**
 * Selection type
 */
export type SelectionType = keyof SelectionState;

