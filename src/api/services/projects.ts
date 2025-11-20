/**
 * Projects API service
 * Type-safe methods for project operations
 */

import { apiClient } from '../client';
import type { Project } from '../../types';

/**
 * Get all projects for the current user's team(s)
 */
export async function getProjects(): Promise<Project[]> {
  return apiClient.get<Project[]>('/api/projects');
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project> {
  return apiClient.get<Project>(`/api/projects/${projectId}`);
}

/**
 * Create a new project
 */
export async function createProject(data: Partial<Project>): Promise<Project> {
  return apiClient.post<Project>('/api/projects', data);
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  return apiClient.patch<Project>(`/api/projects/${projectId}`, data);
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  return apiClient.delete<void>(`/api/projects/${projectId}`);
}

/**
 * Get all journeys for a project
 */
export async function getProjectJourneys(projectId: string): Promise<Project & { journeys: any[] }> {
  return apiClient.get<Project & { journeys: any[] }>(`/api/projects/${projectId}/journeys`);
}

