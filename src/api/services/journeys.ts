/**
 * Journey API service
 * Type-safe methods for journey operations
 */

import { apiClient } from '../client';
import type { Journey, Phase, Step } from '../../types';

/**
 * Get a journey with full structure (phases, steps, cards, subjourneys)
 */
export async function getJourney(
  journeyId: string,
  includeSubjourneys = true
): Promise<Journey> {
  return apiClient.get<Journey>(
    `/api/journeys/${journeyId}/structure?include_subjourneys=${includeSubjourneys}`
  );
}

/**
 * Create a new journey
 */
export async function createJourney(
  data: Partial<Journey>
): Promise<Journey> {
  return apiClient.post<Journey>('/api/journeys', data);
}

/**
 * Update a journey
 */
export async function updateJourney(
  journeyId: string,
  data: Partial<Journey>
): Promise<Journey> {
  return apiClient.patch<Journey>(`/api/journeys/${journeyId}`, data);
}

/**
 * Delete a journey
 */
export async function deleteJourney(journeyId: string): Promise<void> {
  return apiClient.delete<void>(`/api/journeys/${journeyId}`);
}

/**
 * Create a phase in a journey
 */
export async function createPhase(
  journeyId: string,
  data: Partial<Phase>
): Promise<Phase> {
  return apiClient.post<Phase>(`/api/journeys/${journeyId}/phases`, data);
}

/**
 * Update a phase
 */
export async function updatePhase(
  phaseId: string,
  data: Partial<Phase>
): Promise<Phase> {
  return apiClient.patch<Phase>(`/api/phases/${phaseId}`, data);
}

/**
 * Delete a phase
 */
export async function deletePhase(phaseId: string): Promise<void> {
  return apiClient.delete<void>(`/api/phases/${phaseId}`);
}

/**
 * Create a step in a phase
 * Returns the complete journey structure with allSteps
 */
export async function createStep(
  phaseId: string,
  data: Partial<Step>
): Promise<Step> {
  return apiClient.post<Step>('/api/steps/create', {
    phase_id: phaseId,
    ...data,
  });
}

/**
 * Update a step
 */
export async function updateStep(
  stepId: string,
  data: Partial<Step>
): Promise<Step> {
  return apiClient.patch<Step>(`/api/steps/${stepId}`, data);
}

/**
 * Delete a step
 */
export async function deleteStep(stepId: string): Promise<void> {
  return apiClient.delete<void>(`/api/steps/${stepId}`);
}

/**
 * Create a subjourney for a step
 * Returns the complete parent journey structure
 */
export async function createSubjourney(
  stepId: string,
  data: Partial<Journey>
): Promise<Journey> {
  return apiClient.post<Journey>(`/api/steps/${stepId}/subjourneys`, data);
}

/**
 * Reorder steps within a phase
 */
export async function reorderSteps(
  phaseId: string,
  stepIds: string[]
): Promise<void> {
  return apiClient.post<void>(`/api/phases/${phaseId}/reorder-steps`, {
    step_ids: stepIds,
  });
}

/**
 * Move a step to a different phase
 */
export async function moveStepToPhase(
  stepId: string,
  targetPhaseId: string
): Promise<void> {
  return apiClient.post<void>(`/api/steps/${stepId}/move`, {
    phase_id: targetPhaseId,
  });
}

/**
 * Reorder phases within a journey
 */
export async function reorderPhases(
  journeyId: string,
  phaseIds: string[]
): Promise<void> {
  return apiClient.post<void>(`/api/journeys/${journeyId}/reorder-phases`, {
    phase_ids: phaseIds,
  });
}

/**
 * Get all journeys for a project
 */
export async function getProjectJourneys(projectId: string): Promise<Journey[]> {
  return apiClient.get<Journey[]>(`/api/journeys/project/${projectId}`);
}

