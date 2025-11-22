/**
 * Journey DnD Container
 * Outermost container for journey content that will be measured for sizing
 * Handles drag-and-drop for phases, steps, and cards
 */

import { useCallback, useEffect, useRef } from 'react';
import { DragDropProvider, DragOverlay, useDragDropManager } from '@dnd-kit/react';
import type { Journey } from '../../types';
import { DnDPhaseGrid } from './DnDPhaseGrid';
import { useAppStore } from '../../store';
import { journeysApi, cardsApi } from '../../api';
import { useReactFlow } from '@xyflow/react';
import { StepComponent } from './StepComponent';
import { PhaseComponent } from './PhaseComponent';

interface JourneyDnDContainerProps {
  journey: Journey;
}

/**
 * JourneyDnDContainer - The outermost container that gets measured
 * This container's size is reported to React Flow for node sizing
 */
export function JourneyDnDContainer({ journey }: JourneyDnDContainerProps) {
  const { setCurrentJourney, phases, steps, cards, reorderStepsOptimistic, setDraggingStep, isDraggingStep } = useAppStore();
  const { getZoom } = useReactFlow();
  const manager = useDragDropManager();
  const originalStepOrderRef = useRef<Map<string, string[]>>(new Map());
  const lastOverIdRef = useRef<string | null>(null);
  const phaseOrderRef = useRef<Map<string, string[]>>(new Map());
  const initialPhaseIdRef = useRef<string | null>(null);
  const workingPhaseIdRef = useRef<string | null>(null);
  const baselineMoveSnapshotRef = useRef<any | null>(null);

  // No-op: legacy helper removed; store handles persistence

  // Persist reorder with one retry after refreshing the journey if 400 occurs
  // Persistence is handled by the store (batched, debounced)

  // Handle drag start - save original order for potential revert
  const handleDragStart = useCallback((event: any, _manager: any) => {
    const { operation } = event;
    lastOverIdRef.current = null; // Reset last over ID
    if (operation?.source) {
      const activeData = operation.source.data;
      if (activeData?.type === 'step') {
        const activeStep = steps.find((s) => s.id === String(operation.source.id));
        if (activeStep) {
          // Save original order for this phase
          const phaseSteps = steps
            .filter((s) => s.phase_id === activeStep.phase_id)
            .sort((a, b) => a.sequence_order - b.sequence_order)
            .map((s) => s.id);
          originalStepOrderRef.current.set(activeStep.phase_id, phaseSteps);
          setDraggingStep(true);
          // Track base and current phase for cross-phase optimistic transitions
          initialPhaseIdRef.current = activeStep.phase_id;
          workingPhaseIdRef.current = activeStep.phase_id;
          baselineMoveSnapshotRef.current = null;
        }
      }
    }
  }, [steps, setDraggingStep]);

  // Handle drag over - update order optimistically for live switching animation
  const handleDragOver = useCallback(
    (event: any, _manager: any) => {
      const { operation } = event;
      if (!operation?.source || !operation?.target) {
        // Reset last over ID if no target
        lastOverIdRef.current = null;
        return;
      }

      const { source, target } = operation;
      const activeId = String(source.id);
      const overId = String(target.id);
      const activeData = source.data;
      const overData = target.data;

      // Only handle step behavior
      if (activeData?.type === 'step') {
        if (overData?.type === 'step') {
          const activeStep = steps.find((s) => s.id === activeId);
          const overStep = steps.find((s) => s.id === overId);
          if (!activeStep || !overStep) return;

          const workingPhaseId = workingPhaseIdRef.current ?? activeStep.phase_id;

          // Cross-phase: move optimistically into target phase when entering it
          if (workingPhaseId !== overStep.phase_id) {
            if (lastOverIdRef.current === overId) {
              return;
            }
            // Insert AFTER the hovered step by targeting the next step id (or append)
            const targetList = steps
              .filter((s) => s.phase_id === overStep.phase_id)
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((s) => String(s.id));
            const hoveredIndex = targetList.indexOf(String(overId));
            const beforeStepId = hoveredIndex >= 0 && hoveredIndex < targetList.length - 1
              ? targetList[hoveredIndex + 1]
              : null;
            const snapshot = useAppStore.getState().moveStepToPhaseOptimistic(activeId, overStep.phase_id, beforeStepId);
            // Save baseline revert snapshot only on first cross-phase transition
            if (!baselineMoveSnapshotRef.current && initialPhaseIdRef.current && initialPhaseIdRef.current !== overStep.phase_id) {
              baselineMoveSnapshotRef.current = snapshot;
            }
            // Update working orders for both phases
            if (snapshot?.sourcePhaseId && snapshot?.sourceOrder) {
              phaseOrderRef.current.set(snapshot.sourcePhaseId, snapshot.sourceOrder);
            }
            if (snapshot?.targetPhaseId && snapshot?.targetOrder) {
              phaseOrderRef.current.set(snapshot.targetPhaseId, snapshot.targetOrder);
            }
            workingPhaseIdRef.current = overStep.phase_id;
            lastOverIdRef.current = overId;
            // Force update collision shapes after layout shift
            try { manager?.collisionObserver.forceUpdate(false); } catch {}
            return;
          }

          // Same phase - reorder within phase
          if (workingPhaseId === overStep.phase_id && activeId !== overId) {
            // Only update if the target has changed to avoid flickering
            if (lastOverIdRef.current === overId) {
              return; // Already processed this target
            }

            // Use a stable working order captured at drag start to avoid jitter
            let workingOrder = phaseOrderRef.current.get(workingPhaseId);
            if (!workingOrder) {
              workingOrder = steps
                .filter((s) => s.phase_id === workingPhaseId)
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((s) => s.id);
              phaseOrderRef.current.set(workingPhaseId, workingOrder);
            }

            const activeIndex = workingOrder.indexOf(activeId);
            const overIndex = workingOrder.indexOf(overId);

            if (activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex) {
              // Calculate new order
              const newOrder = [...workingOrder];
              newOrder.splice(activeIndex, 1);
              newOrder.splice(overIndex, 0, activeId);

              // Update store optimistically to trigger re-render and animation
              reorderStepsOptimistic(workingPhaseId, newOrder);
              
              // Remember this target so we don't update again until it changes
              lastOverIdRef.current = overId;
              // Update working order for subsequent moves
              phaseOrderRef.current.set(workingPhaseId, newOrder);
              // Force update collision shapes after layout shift
              try { manager?.collisionObserver.forceUpdate(false); } catch {}
            }
          }
        } else if (overData?.type === 'phase') {
          const activeStep = steps.find((s) => s.id === activeId);
          if (!activeStep) return;
          const workingPhaseId = workingPhaseIdRef.current ?? activeStep.phase_id;
          const targetPhaseId = String(overId);
          if (workingPhaseId !== targetPhaseId) {
            const snapshot = useAppStore.getState().moveStepToPhaseOptimistic(activeId, targetPhaseId, null);
            if (!baselineMoveSnapshotRef.current && initialPhaseIdRef.current && initialPhaseIdRef.current !== targetPhaseId) {
              baselineMoveSnapshotRef.current = snapshot;
            }
            if (snapshot?.sourcePhaseId && snapshot?.sourceOrder) {
              phaseOrderRef.current.set(snapshot.sourcePhaseId, snapshot.sourceOrder);
            }
            if (snapshot?.targetPhaseId && snapshot?.targetOrder) {
              phaseOrderRef.current.set(snapshot.targetPhaseId, snapshot.targetOrder);
            }
            workingPhaseIdRef.current = targetPhaseId;
            lastOverIdRef.current = null;
            // Force update collision shapes after layout shift
            try { manager?.collisionObserver.forceUpdate(false); } catch {}
          }
        } else {
          // Not a step drag - reset
          lastOverIdRef.current = null;
        }
      } else {
        // Not a step drag - reset
        lastOverIdRef.current = null;
      }
    },
    [steps, reorderStepsOptimistic, manager]
  );

  // Handle drag end - reorder phases, steps, or cards
  const handleDragEnd = useCallback(
      async (event: any, _manager: any) => {
      const { operation, canceled } = event;
      
      // Reset last over ID on drag end
      lastOverIdRef.current = null;
      // Clear dragging flag
      setDraggingStep(false);
      
      // If canceled, revert optimistic update
      if (canceled) {
        const activeData = operation?.source?.data;
        if (activeData?.type === 'step') {
          // Revert cross-phase first if applicable
          if (baselineMoveSnapshotRef.current) {
            try { baselineMoveSnapshotRef.current.revert(); } catch {}
          }
          const initialPhaseId = initialPhaseIdRef.current;
          if (initialPhaseId) {
            const originalOrder = originalStepOrderRef.current.get(initialPhaseId);
            if (originalOrder) {
              reorderStepsOptimistic(initialPhaseId, originalOrder);
              originalStepOrderRef.current.delete(initialPhaseId);
            }
          }
          // Cleanup refs
          initialPhaseIdRef.current = null;
          workingPhaseIdRef.current = null;
          baselineMoveSnapshotRef.current = null;
        }
        return;
      }
      
      if (!operation?.source || !operation?.target) {
        // Clean up ref if drag ended without target
        const activeData = operation?.source?.data;
        if (activeData?.type === 'step') {
          const activeStep = steps.find((s) => s.id === String(operation.source.id));
          if (activeStep) {
            originalStepOrderRef.current.delete(activeStep.phase_id);
          }
        }
        return;
      }

      const { source, target } = operation;
      const activeId = String(source.id);
      const overId = String(target.id);
      const activeData = source.data;
      const overData = target.data;

      // Phase reordering
      if (activeData?.type === 'phase' && overData?.type === 'phase' && activeId !== overId) {
        const currentPhaseOrder = phases
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .map((p) => p.id);

        const activeIndex = currentPhaseOrder.indexOf(activeId);
        const overIndex = currentPhaseOrder.indexOf(overId);

        // Reorder phases
        const newOrder = [...currentPhaseOrder];
        newOrder.splice(activeIndex, 1);
        newOrder.splice(overIndex, 0, activeId);

        try {
          await journeysApi.reorderPhases(journey.id, newOrder);
          // Reload journey to get updated data
          const updatedJourney = await journeysApi.getJourney(journey.id, true);
          setCurrentJourney(updatedJourney);
        } catch (error) {
          console.error('Failed to reorder phases:', error);
        }
        return;
      }

      // Step reordering / cross-phase persistence
      if (activeData?.type === 'step') {
        const activeStep = steps.find((s) => s.id === activeId);
        if (!activeStep) return;
        const initialPhaseId = initialPhaseIdRef.current ?? activeStep.phase_id;
        const finalPhaseId = workingPhaseIdRef.current ?? activeStep.phase_id;

        // Check if dropped on another step
        if (overData?.type === 'step') {
          const overStep = steps.find((s) => s.id === overId);
          if (!overStep) return;

          // Same phase - reorder within phase (optimistic, no refresh)
          if (finalPhaseId === overStep.phase_id) {
            // Rebuild order from the latest store to avoid stale cross-phase IDs
            const phaseStepsFromStore = useAppStore
              .getState()
              .steps.filter((s) => s.phase_id === finalPhaseId)
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((s) => String(s.id));

            const activeIndex = phaseStepsFromStore.indexOf(activeId);
            const overIndex = phaseStepsFromStore.indexOf(overId);
            const newOrder = [...phaseStepsFromStore];
            newOrder.splice(activeIndex, 1);
            newOrder.splice(overIndex, 0, activeId);

            // We've already updated the store via onDragOver; schedule a batched persist via store
            useAppStore.getState().scheduleReorderPersist(finalPhaseId);
            // Cleanup originals
            originalStepOrderRef.current.delete(finalPhaseId);
            // Cleanup and clear working orders
            initialPhaseIdRef.current = null;
            workingPhaseIdRef.current = null;
            baselineMoveSnapshotRef.current = null;
            phaseOrderRef.current.clear();
            return;
          }

          // Different phases - move step to new phase (optimistic already applied during drag-over)
          try {
            await journeysApi.moveStepToPhase(activeId, finalPhaseId);
            // Schedule batched persists for both phases
            useAppStore.getState().scheduleReorderPersist(finalPhaseId, 250);
            if (initialPhaseId && initialPhaseId !== finalPhaseId) {
              useAppStore.getState().scheduleReorderPersist(initialPhaseId, 250);
            }
          } catch {
            // Keep UI optimistic; ignore move errors here
          }
          // Cleanup and clear working orders
          initialPhaseIdRef.current = null;
          workingPhaseIdRef.current = null;
          baselineMoveSnapshotRef.current = null;
          phaseOrderRef.current.clear();
          return;
        }

        // Check if dropped on a phase (empty phase) - append to end
        if (overData?.type === 'phase') {
          try {
            await journeysApi.moveStepToPhase(activeId, overId);
            // Schedule batched persists
            useAppStore.getState().scheduleReorderPersist(overId, 250);
            const initialPhaseId = initialPhaseIdRef.current;
            if (initialPhaseId && initialPhaseId !== overId) {
              useAppStore.getState().scheduleReorderPersist(initialPhaseId, 250);
            }
          } catch {
            // Keep UI optimistic
          }
          // Cleanup and clear working orders
          initialPhaseIdRef.current = null;
          workingPhaseIdRef.current = null;
          baselineMoveSnapshotRef.current = null;
          phaseOrderRef.current.clear();
          return;
        }
      }

      // Card reordering
      if (activeData?.type === 'card') {
        const activeCard = cards.find((c) => c.id === activeId);
        if (!activeCard) return;

        // Check if dropped on another card
        if (overData?.type === 'card') {
          const overCard = cards.find((c) => c.id === overId);
          if (!overCard) return;

          // Same step - reorder within step
          if (activeCard.step_id === overCard.step_id) {
            const stepCards = cards
              .filter((c) => c.step_id === activeCard.step_id)
              .sort((a, b) => a.position - b.position)
              .map((c) => c.id);

            const activeIndex = stepCards.indexOf(activeId);
            const overIndex = stepCards.indexOf(overId);

            const newOrder = [...stepCards];
            newOrder.splice(activeIndex, 1);
            newOrder.splice(overIndex, 0, activeId);

            try {
              await cardsApi.reorderCards(activeCard.step_id, newOrder);
              const updatedJourney = await journeysApi.getJourney(journey.id, true);
              setCurrentJourney(updatedJourney);
            } catch (error) {
              console.error('Failed to reorder cards:', error);
            }
            return;
          }

          // Different steps - move card to new step
          try {
            await cardsApi.moveCardToStep(activeId, overCard.step_id);
            const updatedJourney = await journeysApi.getJourney(journey.id, true);
            setCurrentJourney(updatedJourney);
          } catch (error) {
            console.error('Failed to move card:', error);
          }
          return;
        }

        // Check if dropped on a step (empty step)
        if (overData?.type === 'step') {
          try {
            await cardsApi.moveCardToStep(activeId, overId);
            const updatedJourney = await journeysApi.getJourney(journey.id, true);
            setCurrentJourney(updatedJourney);
          } catch (error) {
            console.error('Failed to move card to step:', error);
          }
          return;
        }
      }
    },
    [journey.id, phases, steps, cards, setCurrentJourney]
  );

  // Keep droppable hitboxes in sync as layout changes while dragging (phase widths change)
  useEffect(() => {
    if (!isDraggingStep) return;
    try {
      manager?.collisionObserver.forceUpdate(false);
    } catch {}
  }, [steps, phases, manager, isDraggingStep]);

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div
        className="journey-content"
        style={{
          // This is the outermost container that will be measured
          display: 'flex',
          flexDirection: 'column',
          width: 'fit-content',
          height: 'fit-content',

          // No minHeight - let content determine height naturally
          padding: 'var(--spacing-lg)',
          boxSizing: 'border-box',
        }}
      >
        <DnDPhaseGrid 
          phases={journey.allPhases || []} 
          subjourneys={journey.subjourneys || []}
          steps={journey.allSteps || []}
        />
      </div>
      <DragOverlay>
        {(source: any) => {
          const zoom = typeof getZoom === 'function' ? getZoom() : 1;
          const scale = Math.max(zoom, 0.01);
          const phaseId = source?.id ? String(source.id) : undefined;
          const draggedPhase = phaseId ? phases.find((p) => p.id === phaseId) : undefined;
          const stepId = source?.id ? String(source.id) : undefined;
          const draggedStep = stepId ? steps.find((s) => s.id === stepId) : undefined;
          if (draggedPhase) {
            let normalizedHeaderWidth: number | undefined = undefined;
            try {
              const headerEl = typeof document !== 'undefined'
                ? (document.querySelector(`[data-phase-id="${draggedPhase.id}"] .phase-header`) as HTMLElement | null)
                : null;
              const headerWidth = headerEl?.getBoundingClientRect().width;
              if (headerWidth && Number.isFinite(headerWidth)) {
                normalizedHeaderWidth = headerWidth / scale;
              }
            } catch {
              // ignore DOM access issues
            }
            return (
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  width: normalizedHeaderWidth ? `${normalizedHeaderWidth}px` : undefined,
                }}
              >
                <PhaseComponent phase={draggedPhase} />
              </div>
            );
          }
          if (draggedStep) {
            // Render a zoom-normalized preview of the step while dragging
            return (
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              >
                <StepComponent step={draggedStep} hasSubjourney={false} />
              </div>
            );
          }
          return null;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
