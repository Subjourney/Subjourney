/**
 * Journey DnD Container
 * Outermost container for journey content that will be measured for sizing
 * Handles drag-and-drop for phases, steps, and cards
 */

import { useCallback } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import type { Journey } from '../../types';
import { DnDPhaseGrid } from './DnDPhaseGrid';
import { useAppStore } from '../../store';
import { journeysApi, cardsApi } from '../../api';

interface JourneyDnDContainerProps {
  journey: Journey;
}

/**
 * JourneyDnDContainer - The outermost container that gets measured
 * This container's size is reported to React Flow for node sizing
 */
export function JourneyDnDContainer({ journey }: JourneyDnDContainerProps) {
  const { setCurrentJourney, phases, steps, cards } = useAppStore();

  // Handle drag start
  const handleDragStart = useCallback((event: any, _manager: any) => {
    const { operation } = event;
    // Track active drag if needed in the future
    if (operation?.source) {
      // Drag started
    }
  }, []);

  // Handle drag end - reorder phases, steps, or cards
  const handleDragEnd = useCallback(
      async (event: any, _manager: any) => {
      const { operation, canceled } = event;
      
      if (canceled || !operation?.source || !operation?.target) return;

      const { source, target } = operation;
      const activeId = String(source.id);
      const overId = String(target.id);
      const activeData = source.data?.current;
      const overData = target.data?.current;

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

      // Step reordering
      if (activeData?.type === 'step') {
        const activeStep = steps.find((s) => s.id === activeId);
        if (!activeStep) return;

        // Check if dropped on another step
        if (overData?.type === 'step') {
          const overStep = steps.find((s) => s.id === overId);
          if (!overStep) return;

          // Same phase - reorder within phase
          if (activeStep.phase_id === overStep.phase_id) {
            const phaseSteps = steps
              .filter((s) => s.phase_id === activeStep.phase_id)
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((s) => s.id);

            const activeIndex = phaseSteps.indexOf(activeId);
            const overIndex = phaseSteps.indexOf(overId);

            const newOrder = [...phaseSteps];
            newOrder.splice(activeIndex, 1);
            newOrder.splice(overIndex, 0, activeId);

            try {
              await journeysApi.reorderSteps(activeStep.phase_id, newOrder);
              const updatedJourney = await journeysApi.getJourney(journey.id, true);
              setCurrentJourney(updatedJourney);
            } catch (error) {
              console.error('Failed to reorder steps:', error);
            }
            return;
          }

          // Different phases - move step to new phase
          try {
            await journeysApi.moveStepToPhase(activeId, overStep.phase_id);
            const updatedJourney = await journeysApi.getJourney(journey.id, true);
            setCurrentJourney(updatedJourney);
          } catch (error) {
            console.error('Failed to move step:', error);
          }
          return;
        }

        // Check if dropped on a phase (empty phase)
        if (overData?.type === 'phase') {
          try {
            await journeysApi.moveStepToPhase(activeId, overId);
            const updatedJourney = await journeysApi.getJourney(journey.id, true);
            setCurrentJourney(updatedJourney);
          } catch (error) {
            console.error('Failed to move step to phase:', error);
          }
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

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
    </DragDropProvider>
  );
}
