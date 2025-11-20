/**
 * Unified Zustand store for Subjourney
 * Centralized state management with type safety
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EntityId,
  Journey,
  Phase,
  Step,
  Card,
  Attribute,
  Flow,
} from '../types';
import type {
  SelectionState,
  UIState,
  DataState,
  SelectOptions,
  SelectionType,
} from './types';

/**
 * App store interface
 */
interface AppStore extends SelectionState, UIState, DataState {
  // Selection actions
  select: (type: SelectionType, id: EntityId | null, options?: SelectOptions) => void;
  clearSelection: () => void;
  deselect: (type: SelectionType) => void;

  // Selection selectors
  isStepSelected: (stepId: EntityId) => boolean;
  isPhaseSelected: (phaseId: EntityId) => boolean;
  isJourneySelected: (journeyId: EntityId) => boolean;
  isCardSelected: (cardId: EntityId) => boolean;
  isAttributeSelected: (attributeId: EntityId) => boolean;
  isFlowSelected: (flowId: EntityId) => boolean;
  getSelectionSummary: () => SelectionState;

  // UI actions
  toggleSubjourneyCollapsed: (parentStepId: EntityId, allJourneys?: Journey[]) => void;
  setSubjourneyCollapsed: (parentStepId: EntityId, collapsed: boolean) => void;
  isSubjourneyCollapsed: (parentStepId: EntityId) => boolean;
  isSubjourneyVisible: (parentStepId: EntityId) => boolean;
  clearCollapsedSubjourneys: () => void;
  setEditingActive: (active: boolean) => void;
  setDisableHover: (disabled: boolean) => void;
  setServiceBlueprintOpen: (open: boolean) => void;
  setDraggedBlueprintItem: (item: unknown | null) => void;
  setCenterWhenClicked: (enabled: boolean) => void;

  // Loading state actions
  setStepLoading: (stepId: EntityId, loading: boolean) => void;
  setSubjourneyLoading: (subjourneyId: EntityId, loading: boolean) => void;
  isStepLoading: (stepId: EntityId) => boolean;
  isSubjourneyLoading: (subjourneyId: EntityId) => boolean;
  clearAllLoading: () => void;

  // Data actions
  setCurrentJourney: (journey: Journey | null) => void;
  setPhases: (phases: Phase[]) => void;
  setSteps: (steps: Step[]) => void;
  setCards: (cards: Card[]) => void;
  setAttributes: (attributes: Attribute[]) => void;
  setFlows: (flows: Flow[]) => void;

  // Data selectors
  getPhaseById: (id: EntityId) => Phase | undefined;
  getStepById: (id: EntityId) => Step | undefined;
  getCardById: (id: EntityId) => Card | undefined;
  getAttributeById: (id: EntityId) => Attribute | undefined;
  getFlowById: (id: EntityId) => Flow | undefined;
  getCardsForStep: (stepId: EntityId) => Card[];
  getStepsForPhase: (phaseId: EntityId) => Step[];
  getPhasesForJourney: (journeyId: EntityId) => Phase[];

  // Validation
  validateSelection: (journeyNodes?: unknown[]) => void;
}

/**
 * Create the app store
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====

      // Selection state
      selectedStep: null,
      selectedPhase: null,
      selectedJourney: null,
      selectedProject: null,
      selectedAttribute: null,
      selectedFirstAttributeType: null,
      selectedCard: null,
      selectedFlow: null,

      // UI state
      editingActive: true,
      collapsedSubjourneys: new Set(),
      loadingSteps: new Set(),
      loadingSubjourneys: new Set(),
      disableHover: false,
      isServiceBlueprintOpen: false,
      draggedBlueprintItem: null,
      isCenterWhenClicked: false,

      // Data state
      currentJourney: null,
      phases: [],
      steps: [],
      cards: [],
      attributes: [],
      flows: [],

      // ===== SELECTION ACTIONS =====

      select: (type, id, options = {}) => {
        const { immediate = false, source = 'direct' } = options;

        if (!type) {
          console.warn('Invalid selection: type is required');
          return;
        }

        const applySelection = () => {
          const currentState = get();
          const updates: Partial<SelectionState> = {
            selectedStep: null,
            selectedPhase: null,
            selectedJourney: null,
            selectedProject: null,
            selectedAttribute: null,
            selectedFirstAttributeType: null,
            selectedCard: null,
            // Keep selectedFlow unless explicitly changing it
            selectedFlow: type === 'selectedFlow' ? null : currentState.selectedFlow,
          };

          // Handle null id as clearing selection
          if (!id) {
            switch (type) {
              case 'selectedStep':
                updates.selectedStep = null;
                break;
              case 'selectedPhase':
                updates.selectedPhase = null;
                break;
              case 'selectedJourney':
                updates.selectedJourney = null;
                break;
              case 'selectedProject':
                updates.selectedProject = null;
                break;
              case 'selectedAttribute':
                updates.selectedAttribute = null;
                break;
              case 'selectedFirstAttributeType':
                updates.selectedFirstAttributeType = null;
                break;
              case 'selectedCard':
                updates.selectedCard = null;
                break;
              case 'selectedFlow':
                updates.selectedFlow = null;
                break;
            }
            set(updates);
            return;
          }

          // Set the appropriate selection based on type
          switch (type) {
            case 'selectedStep':
              updates.selectedStep = id;
              updates.selectedFlow = currentState.selectedFlow;
              if (source === 'direct') {
                updates.selectedAttribute = null;
              } else {
                updates.selectedAttribute = currentState.selectedAttribute;
              }
              break;
            case 'selectedPhase':
              updates.selectedPhase = id;
              updates.selectedFlow = currentState.selectedFlow;
              updates.selectedAttribute = null;
              break;
            case 'selectedJourney':
              updates.selectedJourney = id;
              updates.selectedFlow = currentState.selectedFlow;
              updates.selectedAttribute = null;
              break;
            case 'selectedProject':
              updates.selectedProject = id;
              updates.selectedFlow = currentState.selectedFlow;
              updates.selectedAttribute = null;
              break;
            case 'selectedAttribute':
              // Toggle logic: if already selected, deselect; otherwise select
              if (currentState.selectedAttribute === id) {
                updates.selectedAttribute = null;
              } else {
                updates.selectedAttribute = id;
              }
              // Keep other selections when selecting an attribute
              updates.selectedStep = currentState.selectedStep;
              updates.selectedPhase = currentState.selectedPhase;
              updates.selectedJourney = currentState.selectedJourney;
              updates.selectedProject = currentState.selectedProject;
              updates.selectedFlow = currentState.selectedFlow;
              break;
            case 'selectedFirstAttributeType':
              updates.selectedFirstAttributeType = id;
              updates.selectedAttribute = null;
              break;
            case 'selectedCard':
              // Toggle logic: if already selected, deselect; otherwise select
              if (currentState.selectedCard === id) {
                updates.selectedCard = null;
              } else {
                updates.selectedCard = id;
                // Clear step, phase, journey, and project selections when selecting a card
                updates.selectedStep = null;
                updates.selectedPhase = null;
                updates.selectedJourney = null;
                updates.selectedProject = null;
              }
              updates.selectedAttribute = null;
              break;
            case 'selectedFlow':
              // Toggle logic: if already selected, deselect; otherwise select
              if (currentState.selectedFlow === id) {
                updates.selectedFlow = null;
              } else {
                updates.selectedFlow = id;
                // Keep step, phase, journey, and project selections when selecting a flow
                updates.selectedStep = currentState.selectedStep;
                updates.selectedPhase = currentState.selectedPhase;
                updates.selectedJourney = currentState.selectedJourney;
                updates.selectedProject = currentState.selectedProject;
              }
              updates.selectedAttribute = null;
              break;
          }

          set(updates);
        };

        if (immediate) {
          applySelection();
        } else {
          // Defer to microtask to avoid render-phase updates
          queueMicrotask(applySelection);
        }
      },

      clearSelection: () => {
        const currentState = get();
        set({
          selectedStep: null,
          selectedPhase: null,
          selectedJourney: null,
          selectedProject: null,
          selectedAttribute: null,
          selectedFirstAttributeType: null,
          selectedCard: null,
          // Keep selectedFlow - flows remain selected until explicitly deselected
          selectedFlow: currentState.selectedFlow,
        });
      },

      deselect: (type) => {
        const updates: Partial<SelectionState> = {};
        switch (type) {
          case 'selectedStep':
            updates.selectedStep = null;
            break;
          case 'selectedPhase':
            updates.selectedPhase = null;
            break;
          case 'selectedJourney':
            updates.selectedJourney = null;
            break;
          case 'selectedProject':
            updates.selectedProject = null;
            break;
          case 'selectedAttribute':
            updates.selectedAttribute = null;
            break;
          case 'selectedFirstAttributeType':
            updates.selectedFirstAttributeType = null;
            break;
          case 'selectedCard':
            updates.selectedCard = null;
            break;
          case 'selectedFlow':
            updates.selectedFlow = null;
            break;
        }
        set(updates);
      },

      // Selection selectors
      isStepSelected: (stepId) => get().selectedStep === stepId,
      isPhaseSelected: (phaseId) => get().selectedPhase === phaseId,
      isJourneySelected: (journeyId) => get().selectedJourney === journeyId,
      isCardSelected: (cardId) => get().selectedCard === cardId,
      isAttributeSelected: (attributeId) => get().selectedAttribute === attributeId,
      isFlowSelected: (flowId) => get().selectedFlow === flowId,
      getSelectionSummary: () => {
        const state = get();
        return {
          selectedStep: state.selectedStep,
          selectedPhase: state.selectedPhase,
          selectedJourney: state.selectedJourney,
          selectedAttribute: state.selectedAttribute,
          selectedFirstAttributeType: state.selectedFirstAttributeType,
          selectedCard: state.selectedCard,
          selectedFlow: state.selectedFlow,
        };
      },

      // ===== UI ACTIONS =====

      toggleSubjourneyCollapsed: (parentStepId, allJourneys) => {
        set((state) => {
          const isCurrentlyCollapsed = state.collapsedSubjourneys.has(parentStepId);
          const next = new Set(state.collapsedSubjourneys);

          if (isCurrentlyCollapsed) {
            // Expanding - remove from collapsed set
            next.delete(parentStepId);
          } else {
            // Collapsing - add to collapsed set and cascade to nested subjourneys
            next.add(parentStepId);

            // If allJourneys is provided, cascade collapse to nested subjourneys
            if (allJourneys) {
              const findNestedSubjourneys = (stepId: EntityId): EntityId[] => {
                const nested: EntityId[] = [];
                const visited = new Set<EntityId>();

                const findRecursively = (currentStepId: EntityId) => {
                  if (visited.has(currentStepId)) return;
                  visited.add(currentStepId);

                  const subjourney = allJourneys.find(
                    (j) =>
                      j.is_subjourney &&
                      (j.parent_step_id === currentStepId ||
                        (j as unknown as { parentStepId?: EntityId }).parentStepId === currentStepId)
                  );

                  if (subjourney) {
                    nested.push(currentStepId);
                    const subjourneySteps = subjourney.allSteps || [];
                    subjourneySteps.forEach((step) => {
                      findRecursively(step.id);
                    });
                  }
                };

                findRecursively(stepId);
                return nested;
              };

              const nestedIds = findNestedSubjourneys(parentStepId);
              nestedIds.forEach((nestedStepId) => {
                next.add(nestedStepId);
              });
            }
          }

          return { collapsedSubjourneys: next };
        });
      },

      setSubjourneyCollapsed: (parentStepId, collapsed) => {
        set((state) => {
          const next = new Set(state.collapsedSubjourneys);
          if (collapsed) {
            next.add(parentStepId);
          } else {
            next.delete(parentStepId);
          }
          return { collapsedSubjourneys: next };
        });
      },

      isSubjourneyCollapsed: (parentStepId) =>
        get().collapsedSubjourneys.has(parentStepId),

      isSubjourneyVisible: (parentStepId) =>
        !get().collapsedSubjourneys.has(parentStepId),

      clearCollapsedSubjourneys: () => {
        set({ collapsedSubjourneys: new Set() });
      },

      setEditingActive: (active) => {
        set({ editingActive: active });
      },

      setDisableHover: (disabled) => {
        set({ disableHover: disabled });
      },

      setServiceBlueprintOpen: (open) => {
        set({ isServiceBlueprintOpen: open });
      },

      setDraggedBlueprintItem: (item) => {
        set({ draggedBlueprintItem: item });
      },

      setCenterWhenClicked: (enabled) => {
        set({ isCenterWhenClicked: enabled });
      },

      // ===== LOADING STATE ACTIONS =====

      setStepLoading: (stepId, loading) => {
        set((state) => ({
          loadingSteps: loading
            ? new Set([...state.loadingSteps, stepId])
            : new Set([...state.loadingSteps].filter((id) => id !== stepId)),
        }));
      },

      setSubjourneyLoading: (subjourneyId, loading) => {
        set((state) => ({
          loadingSubjourneys: loading
            ? new Set([...state.loadingSubjourneys, subjourneyId])
            : new Set([...state.loadingSubjourneys].filter((id) => id !== subjourneyId)),
        }));
      },

      isStepLoading: (stepId) => get().loadingSteps.has(stepId),
      isSubjourneyLoading: (subjourneyId) => get().loadingSubjourneys.has(subjourneyId),

      clearAllLoading: () => {
        set({
          loadingSteps: new Set(),
          loadingSubjourneys: new Set(),
        });
      },

      // ===== DATA ACTIONS =====

      setCurrentJourney: (journey) => {
        set({ currentJourney: journey });
        // Also update phases, steps, and cards from journey if available
        // Include subjourney data as well
        if (journey) {
          const allPhases = [...(journey.allPhases || [])];
          const allSteps = [...(journey.allSteps || [])];
          const allCards = [...(journey.allCards || [])];
          
          // Add subjourney phases, steps, and cards
          if (journey.subjourneys) {
            journey.subjourneys.forEach((subjourney) => {
              if (subjourney.allPhases) {
                allPhases.push(...subjourney.allPhases);
              }
              if (subjourney.allSteps) {
                allSteps.push(...subjourney.allSteps);
              }
              if (subjourney.allCards) {
                allCards.push(...subjourney.allCards);
              }
            });
          }
          
          set({
            phases: allPhases,
            steps: allSteps,
            cards: allCards,
          });
        }
      },

      setPhases: (phases) => {
        set({ phases });
      },

      setSteps: (steps) => {
        set({ steps });
      },

      setCards: (cards) => {
        set({ cards });
      },

      setAttributes: (attributes) => {
        set({ attributes });
      },

      setFlows: (flows) => {
        set({ flows });
      },

      // ===== DATA SELECTORS =====

      getPhaseById: (id) => {
        return get().phases.find((p) => p.id === id);
      },

      getStepById: (id) => {
        return get().steps.find((s) => s.id === id);
      },

      getCardById: (id) => {
        return get().cards.find((c) => c.id === id);
      },

      getAttributeById: (id) => {
        return get().attributes.find((a) => a.id === id);
      },

      getFlowById: (id) => {
        return get().flows.find((f) => f.id === id);
      },

      getCardsForStep: (stepId) => {
        return get().cards.filter((c) => c.step_id === stepId);
      },

      getStepsForPhase: (phaseId) => {
        return get().steps.filter((s) => s.phase_id === phaseId);
      },

      getPhasesForJourney: (journeyId) => {
        return get().phases.filter((p) => p.journey_id === journeyId);
      },

      // ===== VALIDATION =====

      validateSelection: (journeyNodes) => {
        const state = get();
        const { selectedStep, selectedPhase, selectedJourney } = state;

        // Check if selected step still exists
        if (selectedStep && !state.steps.find((s) => s.id === selectedStep)) {
          console.warn('Selected step no longer exists, clearing selection');
          state.deselect('selectedStep');
        }

        // Check if selected phase still exists
        if (selectedPhase && !state.phases.find((p) => p.id === selectedPhase)) {
          console.warn('Selected phase no longer exists, clearing selection');
          state.deselect('selectedPhase');
        }

        // Validate journey if journeyNodes provided
        if (selectedJourney && journeyNodes) {
          const journeyExists =
            Array.isArray(journeyNodes) &&
            journeyNodes.some(
              (node: unknown) =>
                typeof node === 'object' &&
                node !== null &&
                'type' in node &&
                'id' in node &&
                (node as { type: string; id: string }).type === 'journey-node' &&
                (node as { type: string; id: string }).id === selectedJourney
            );
          if (!journeyExists) {
            console.warn('Selected journey no longer exists, clearing selection');
            state.deselect('selectedJourney');
          }
        }
      },
    }),
    {
      name: 'subjourney-store',
      version: 1,
      partialize: (state) => ({
        // Persist selection state
        selectedStep: state.selectedStep,
        selectedPhase: state.selectedPhase,
        selectedJourney: state.selectedJourney,
        selectedAttribute: state.selectedAttribute,
        selectedFirstAttributeType: state.selectedFirstAttributeType,
        selectedCard: state.selectedCard,
        selectedFlow: state.selectedFlow,
        // Persist UI preferences
        editingActive: state.editingActive,
        disableHover: state.disableHover,
        isCenterWhenClicked: state.isCenterWhenClicked,
        // Don't persist: collapsedSubjourneys, loading states, data (should be loaded from API)
      }),
      // Initialize Sets as empty on page load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.collapsedSubjourneys = new Set();
          state.loadingSteps = new Set();
          state.loadingSubjourneys = new Set();
        }
      },
    }
  )
);

