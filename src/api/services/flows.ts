/**
 * Flow API service
 * Type-safe methods for flow operations
 */

import { apiClient } from '../client';
import type { Flow, FlowStep } from '../../types';

/**
 * Get all flows for a project
 */
export async function getFlows(projectId: string): Promise<Flow[]> {
  return apiClient.get<Flow[]>(`/api/projects/${projectId}/flows`);
}

/**
 * Get a flow by ID
 */
export async function getFlow(flowId: string): Promise<Flow> {
  return apiClient.get<Flow>(`/api/flows/${flowId}`);
}

/**
 * Create a flow
 */
export async function createFlow(
  projectId: string,
  data: Partial<Flow>
): Promise<Flow> {
  return apiClient.post<Flow>(`/api/projects/${projectId}/flows`, data);
}

/**
 * Update a flow
 */
export async function updateFlow(
  flowId: string,
  data: Partial<Flow>
): Promise<Flow> {
  return apiClient.patch<Flow>(`/api/flows/${flowId}`, data);
}

/**
 * Delete a flow
 */
export async function deleteFlow(flowId: string): Promise<void> {
  return apiClient.delete<void>(`/api/flows/${flowId}`);
}

/**
 * Get steps for a flow (ordered by sequence_order)
 */
export async function getFlowSteps(flowId: string): Promise<FlowStep[]> {
  return apiClient.get<FlowStep[]>(`/api/flows/${flowId}/steps`);
}

/**
 * Add a step to a flow
 */
export async function addStepToFlow(
  flowId: string,
  stepId: string,
  sequenceOrder: number
): Promise<FlowStep> {
  return apiClient.post<FlowStep>(`/api/flows/${flowId}/steps`, {
    step_id: stepId,
    sequence_order: sequenceOrder,
  });
}

/**
 * Remove a step from a flow
 */
export async function removeStepFromFlow(
  flowId: string,
  stepId: string
): Promise<void> {
  return apiClient.delete<void>(`/api/flows/${flowId}/steps/${stepId}`);
}

/**
 * Reorder steps in a flow
 */
export async function reorderFlowSteps(
  flowId: string,
  stepIds: string[]
): Promise<void> {
  return apiClient.post<void>(`/api/flows/${flowId}/reorder-steps`, {
    step_ids: stepIds,
  });
}

