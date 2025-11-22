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
import { attributesApi } from '../api';
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

  // Attribute instance selectors and actions
  getAttributesForStep: (stepId: EntityId) => Attribute[];
  loadStepAttributesForJourney: (journey: Journey) => Promise<void>;
  addStepAttributeOptimistic: (stepId: EntityId, attribute: Attribute) => Promise<void>;
  removeStepAttributeOptimistic: (stepId: EntityId, index: number) => Promise<void>;
  changeStepAttributeOptimistic: (stepId: EntityId, index: number, attribute: Attribute) => Promise<void>;
  reorderStepAttributesOptimistic: (stepId: EntityId, oldIndex: number, newIndex: number) => void;

  // Step optimistic actions
  addStepToRightOptimistic: (rightOfStepId: EntityId) => Promise<void>;

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
      stepAttributes: {},

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
          selectedProject: state.selectedProject,
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
            currentJourney: journey,
            phases: allPhases,
            steps: allSteps,
            cards: allCards,
          });
        } else {
          set({ currentJourney: journey });
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

      // ===== ATTRIBUTE INSTANCE SELECTORS & ACTIONS =====

      getAttributesForStep: (stepId) => {
        const map = get().stepAttributes || {};
        return map[String(stepId)] || [];
      },

      loadStepAttributesForJourney: async (journey) => {
        if (!journey.allSteps || journey.allSteps.length === 0) {
          return;
        }

        // Collect all step IDs (including subjourney steps)
        const allStepIds = [...journey.allSteps.map((s) => s.id)];
        if (journey.subjourneys) {
          journey.subjourneys.forEach((subjourney) => {
            if (subjourney.allSteps) {
              allStepIds.push(...subjourney.allSteps.map((s) => s.id));
            }
          });
        }

        // Fetch step attributes for all steps in parallel
        const stepAttributePromises = allStepIds.map((stepId) =>
          attributesApi.getStepAttributes(String(stepId)).catch((err) => {
            console.error(`Failed to load attributes for step ${stepId}:`, err);
            return [];
          })
        );

        const stepAttributesResults = await Promise.all(stepAttributePromises);

        // Collect all unique attribute definition IDs
        const attributeDefIds = new Set<string>();
        stepAttributesResults.forEach((stepAttrs) => {
          stepAttrs.forEach((stepAttr) => {
            attributeDefIds.add(stepAttr.attribute_definition_id);
          });
        });

        // Fetch all attribute definitions in parallel
        const attributePromises = Array.from(attributeDefIds).map((attrId) =>
          attributesApi.getAttribute(attrId).catch(() => null)
        );

        const attributes = (await Promise.all(attributePromises)).filter(
          (attr): attr is Attribute => attr !== null
        );

        // Update attributes in store if we got any new ones
        if (attributes.length > 0) {
          const currentAttrs = get().attributes;
          const attrMap = new Map(currentAttrs.map((a) => [a.id, a]));
          attributes.forEach((attr) => {
            attrMap.set(attr.id, attr);
          });
          set({ attributes: Array.from(attrMap.values()) });
        }

        // Map step attributes to attribute definitions, grouped by step ID
        const stepAttributesMap: Record<string, Attribute[]> = {};
        stepAttributesResults.forEach((stepAttrs, idx) => {
          const stepId = allStepIds[idx];
          const attrDefs = stepAttrs
            .map((stepAttr) => {
              return attributes.find((attr) => attr.id === stepAttr.attribute_definition_id);
            })
            .filter((attr): attr is Attribute => attr !== undefined)
            .sort((a, b) => {
              // Sort by sequence_order from step_attributes
              const stepAttrA = stepAttrs.find((sa) => sa.attribute_definition_id === a.id);
              const stepAttrB = stepAttrs.find((sa) => sa.attribute_definition_id === b.id);
              const orderA = stepAttrA?.sequence_order ?? 0;
              const orderB = stepAttrB?.sequence_order ?? 0;
              return orderA - orderB;
            });
          stepAttributesMap[String(stepId)] = attrDefs;
        });

        // Update stepAttributes in store
        const currentStepAttrs = get().stepAttributes || {};
        set({
          stepAttributes: {
            ...currentStepAttrs,
            ...stepAttributesMap,
          },
        });
      },

      addStepAttributeOptimistic: async (stepId, attribute) => {
        const sid = String(stepId);
        const map = get().stepAttributes || {};
        const prev = map[sid] || [];
        // optimistic update
        set({ stepAttributes: { ...map, [sid]: [...prev, attribute] } });
        try {
          await attributesApi.addAttributeToStep(sid, String(attribute.id), 'primary');
        } catch (err) {
          console.error('addAttributeToStep failed', err);
          // revert
          set({ stepAttributes: { ...map, [sid]: prev } });
          throw err;
        }
      },

      removeStepAttributeOptimistic: async (stepId, index) => {
        const sid = String(stepId);
        const map = get().stepAttributes || {};
        const prev = map[sid] || [];
        const removed = prev[index];
        if (!removed) return;
        const next = prev.filter((_, i) => i !== index);
        // optimistic update
        set({ stepAttributes: { ...map, [sid]: next } });
        try {
          await attributesApi.removeAttributeFromStep(sid, String(removed.id));
        } catch (err) {
          console.error('removeAttributeFromStep failed', err);
          // revert
          set({ stepAttributes: { ...map, [sid]: prev } });
          throw err;
        }
      },

      changeStepAttributeOptimistic: async (stepId, index, attribute) => {
        const sid = String(stepId);
        const map = get().stepAttributes || {};
        const prev = map[sid] || [];
        const prevAttr = prev[index];
        const next = [...prev];
        next[index] = attribute;
        // optimistic update
        set({ stepAttributes: { ...map, [sid]: next } });
        try {
          if (prevAttr) {
            await attributesApi.removeAttributeFromStep(sid, String(prevAttr.id));
          }
          await attributesApi.addAttributeToStep(sid, String(attribute.id), 'primary');
        } catch (err) {
          console.error('change attribute failed', err);
          // revert
          set({ stepAttributes: { ...map, [sid]: prev } });
          throw err;
        }
      },

      reorderStepAttributesOptimistic: (stepId, oldIndex, newIndex) => {
        const sid = String(stepId);
        const map = get().stepAttributes || {};
        const prev = map[sid] || [];
        const arr = [...prev];
        const [moved] = arr.splice(oldIndex, 1);
        if (!moved) return;
        arr.splice(newIndex, 0, moved);
        set({ stepAttributes: { ...map, [sid]: arr } });
        // TODO: Persist sequence order when backend endpoint available
      },

      // ===== STEP OPTIMISTIC ACTIONS =====
      addStepToRightOptimistic: async (rightOfStepId) => {
        const state = get();
        const { steps, currentJourney } = state;
        const rightStep = steps.find((s) => s.id === rightOfStepId);
        if (!rightStep || !currentJourney) return;

        // Mark loading for the phase (disables button/spinner)
        state.setStepLoading(rightStep.phase_id, true);

        // Compute target insertion position within phase
        const phaseSteps = steps
          .filter((s) => s.phase_id === rightStep.phase_id)
          .sort((a, b) => a.sequence_order - b.sequence_order);
        const rightIndex = phaseSteps.findIndex((s) => s.id === rightOfStepId);
        const nextStep = rightIndex >= 0 && rightIndex < phaseSteps.length - 1 ? phaseSteps[rightIndex + 1] : null;
        const tempSequence =
          nextStep != null
            ? (rightStep.sequence_order + nextStep.sequence_order) / 2
            : rightStep.sequence_order + 1;

        // Snapshot previous state for revert
        const prevSteps = steps;
        const prevJourney = currentJourney;

        // Create a temporary client-only step (optimistic)
        const tempId = `temp-step-${Date.now()}`;
        const tempStep: Step = {
          id: tempId,
          team_id: rightStep.team_id,
          phase_id: rightStep.phase_id,
          name: 'New Step',
          description: '',
          sequence_order: tempSequence,
          is_subjourney: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Optimistically update store: steps and currentJourney.allSteps
        set({
          steps: [...prevSteps, tempStep],
          currentJourney: {
            ...prevJourney,
            allSteps: [...(prevJourney.allSteps || []), tempStep],
          },
        });

        try {
          // 1) Persist: create step on server
          const createdStep = await (await import('../api')).journeysApi.createStep(rightStep.phase_id, {
            name: tempStep.name,
            sequence_order: Math.ceil(tempSequence),
          });

          // 2) Refresh journey structure from server to ensure durability on refresh
          const refreshedAfterCreate = await (await import('../api')).journeysApi.getJourney(currentJourney.id, true);
          state.setCurrentJourney(refreshedAfterCreate);

          // 3) Ensure ordering: place new step right of target and persist order (best effort)
          const phaseStepsAfterCreate = (refreshedAfterCreate.allSteps || [])
            .filter((s) => s.phase_id === rightStep.phase_id)
            .sort((a, b) => a.sequence_order - b.sequence_order)
            .map((s) => s.id);

          if (createdStep?.id && phaseStepsAfterCreate.includes(createdStep.id)) {
            const withoutNew = phaseStepsAfterCreate.filter((id) => id !== createdStep.id);
            const insertAfterIndex = withoutNew.indexOf(rightOfStepId);
            const desiredOrder = [...withoutNew];
            desiredOrder.splice(insertAfterIndex + 1, 0, createdStep.id);

            try {
              await (await import('../api')).journeysApi.reorderSteps(rightStep.phase_id, desiredOrder);
              const refreshed = await (await import('../api')).journeysApi.getJourney(currentJourney.id, true);
              state.setCurrentJourney(refreshed);
              // Select the newly created step
              if (createdStep?.id) {
                state.select('selectedStep', createdStep.id);
              }
            } catch (reorderErr) {
              console.warn('Failed to reorder steps after creation; using server ordering', reorderErr);
              // Still select the step even if reorder fails
              if (createdStep?.id) {
                state.select('selectedStep', createdStep.id);
              }
            }
          } else if (createdStep?.id) {
            // Select the new step
            state.select('selectedStep', createdStep.id);
          }
        } catch (err) {
          console.error('Failed to create step, reverting optimistic UI', err);
          // Revert
          set({
            steps: prevSteps,
            currentJourney: prevJourney,
          });
          throw err;
        } finally {
          state.setStepLoading(rightStep.phase_id, false);
        }
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

