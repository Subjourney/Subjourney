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
  isDraggingStep: boolean;
  disableHover: boolean;
  isServiceBlueprintOpen: boolean;
  draggedBlueprintItem: unknown | null;
  isCenterWhenClicked: boolean;
  // Canvas spacing settings
  canvasNodeSep: number; // Vertical spacing between nodes in same column
  canvasRankSep: number; // Horizontal spacing between columns (levels)
  canvasMainJourneySep: number; // Extra spacing between rows (main journey + all descendants)
  canvasSpacingPanelMinimized: boolean; // Whether the spacing control panel is minimized
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
  // Map of stepId -> attributes applied to that step (instances)
  stepAttributes: Record<EntityId, Attribute[]>;
}

// Attribute instance optimistic actions and selectors
export interface AttributeInstanceActions {
  getAttributesForStep: (stepId: EntityId) => Attribute[];
  loadStepAttributesForJourney: (journey: Journey) => Promise<void>;
  addStepAttributeOptimistic: (stepId: EntityId, attribute: Attribute) => Promise<void>;
  removeStepAttributeOptimistic: (stepId: EntityId, index: number) => Promise<void>;
  changeStepAttributeOptimistic: (stepId: EntityId, index: number, attribute: Attribute) => Promise<void>;
  reorderStepAttributesOptimistic: (stepId: EntityId, oldIndex: number, newIndex: number) => void;
}

// Step optimistic actions
export interface StepActions {
  addStepToRightOptimistic: (rightOfStepId: EntityId) => Promise<void>;
  reorderStepsOptimistic: (phaseId: EntityId, stepIds: EntityId[]) => void;
  moveStepToPhaseOptimistic: (
    stepId: EntityId,
    targetPhaseId: EntityId,
    beforeStepId?: EntityId | null
  ) => {
    sourcePhaseId: EntityId;
    targetPhaseId: EntityId;
    sourceOrder: EntityId[];
    targetOrder: EntityId[];
    revert: () => void;
  };
}

// Phase optimistic actions
export interface PhaseActions {
  addPhaseToRightOptimistic: (rightOfPhaseId: EntityId) => Promise<void>;
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

