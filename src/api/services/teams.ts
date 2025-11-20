/**
 * Team API service
 * Type-safe methods for team operations
 */

import { apiClient } from '../client';
import type { Team, TeamMembership, Project } from '../../types';

/**
 * Get all teams for the current user
 */
export async function getTeams(): Promise<Team[]> {
  return apiClient.get<Team[]>('/api/teams');
}

/**
 * Get a team by ID
 */
export async function getTeam(teamId: string): Promise<Team> {
  return apiClient.get<Team>(`/api/teams/${teamId}`);
}

/**
 * Get a team by slug
 */
export async function getTeamBySlug(slug: string): Promise<Team> {
  return apiClient.get<Team>(`/api/teams/slug/${slug}`);
}

/**
 * Create a team
 */
export async function createTeam(data: Partial<Team>): Promise<Team> {
  return apiClient.post<Team>('/api/teams', data);
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  data: Partial<Team>
): Promise<Team> {
  return apiClient.patch<Team>(`/api/teams/${teamId}`, data);
}

/**
 * Get team memberships
 */
export async function getTeamMemberships(
  teamId: string
): Promise<TeamMembership[]> {
  return apiClient.get<TeamMembership[]>(`/api/teams/${teamId}/memberships`);
}

/**
 * Get projects for a team
 */
export async function getProjects(teamId: string): Promise<Project[]> {
  return apiClient.get<Project[]>(`/api/teams/${teamId}/projects`);
}

/**
 * Create a project
 */
export async function createProject(
  teamId: string,
  data: Partial<Project>
): Promise<Project> {
  return apiClient.post<Project>(`/api/teams/${teamId}/projects`, data);
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

