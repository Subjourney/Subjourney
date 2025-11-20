/**
 * Convenience hooks for common store operations
 */

import { useAppStore } from './store';
import type { EntityId } from '../types';

/**
 * Hook to get selection state
 */
export function useSelection() {
  const selectedStep = useAppStore((state) => state.selectedStep);
  const selectedPhase = useAppStore((state) => state.selectedPhase);
  const selectedJourney = useAppStore((state) => state.selectedJourney);
  const selectedAttribute = useAppStore((state) => state.selectedAttribute);
  const selectedFirstAttributeType = useAppStore(
    (state) => state.selectedFirstAttributeType
  );
  const selectedCard = useAppStore((state) => state.selectedCard);
  const selectedFlow = useAppStore((state) => state.selectedFlow);
  const select = useAppStore((state) => state.select);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const deselect = useAppStore((state) => state.deselect);

  return {
    selectedStep,
    selectedPhase,
    selectedJourney,
    selectedAttribute,
    selectedFirstAttributeType,
    selectedCard,
    selectedFlow,
    select,
    clearSelection,
    deselect,
  };
}

/**
 * Hook to get current journey data
 */
export function useJourneyData() {
  const currentJourney = useAppStore((state) => state.currentJourney);
  const phases = useAppStore((state) => state.phases);
  const steps = useAppStore((state) => state.steps);
  const cards = useAppStore((state) => state.cards);
  const setCurrentJourney = useAppStore((state) => state.setCurrentJourney);
  const setPhases = useAppStore((state) => state.setPhases);
  const setSteps = useAppStore((state) => state.setSteps);
  const setCards = useAppStore((state) => state.setCards);

  return {
    currentJourney,
    phases,
    steps,
    cards,
    setCurrentJourney,
    setPhases,
    setSteps,
    setCards,
  };
}

/**
 * Hook to get UI state
 */
export function useUIState() {
  const editingActive = useAppStore((state) => state.editingActive);
  const collapsedSubjourneys = useAppStore((state) => state.collapsedSubjourneys);
  const loadingSteps = useAppStore((state) => state.loadingSteps);
  const loadingSubjourneys = useAppStore((state) => state.loadingSubjourneys);
  const toggleSubjourneyCollapsed = useAppStore(
    (state) => state.toggleSubjourneyCollapsed
  );
  const setSubjourneyCollapsed = useAppStore(
    (state) => state.setSubjourneyCollapsed
  );
  const isSubjourneyCollapsed = useAppStore(
    (state) => state.isSubjourneyCollapsed
  );
  const setEditingActive = useAppStore((state) => state.setEditingActive);

  return {
    editingActive,
    collapsedSubjourneys,
    loadingSteps,
    loadingSubjourneys,
    toggleSubjourneyCollapsed,
    setSubjourneyCollapsed,
    isSubjourneyCollapsed,
    setEditingActive,
  };
}

/**
 * Hook to check if a step is selected
 */
export function useIsStepSelected(stepId: EntityId | null) {
  return useAppStore((state) =>
    stepId ? state.isStepSelected(stepId) : false
  );
}

/**
 * Hook to check if a phase is selected
 */
export function useIsPhaseSelected(phaseId: EntityId | null) {
  return useAppStore((state) =>
    phaseId ? state.isPhaseSelected(phaseId) : false
  );
}

/**
 * Hook to get data selectors
 */
export function useDataSelectors() {
  const getPhaseById = useAppStore((state) => state.getPhaseById);
  const getStepById = useAppStore((state) => state.getStepById);
  const getCardById = useAppStore((state) => state.getCardById);
  const getAttributeById = useAppStore((state) => state.getAttributeById);
  const getFlowById = useAppStore((state) => state.getFlowById);
  const getCardsForStep = useAppStore((state) => state.getCardsForStep);
  const getStepsForPhase = useAppStore((state) => state.getStepsForPhase);
  const getPhasesForJourney = useAppStore((state) => state.getPhasesForJourney);

  return {
    getPhaseById,
    getStepById,
    getCardById,
    getAttributeById,
    getFlowById,
    getCardsForStep,
    getStepsForPhase,
    getPhasesForJourney,
  };
}

