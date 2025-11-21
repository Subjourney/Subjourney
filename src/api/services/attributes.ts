/**
 * Attribute API service
 * Type-safe methods for attribute operations
 */

import { apiClient } from '../client';
import type {
  Attribute,
  StepAttribute,
  Persona,
  AttributeType,
} from '../../types';

/**
 * Get all attributes for a team
 */
export async function getAttributes(
  teamId: string,
  projectId?: string
): Promise<Attribute[]> {
  const params = projectId ? `?project_id=${projectId}` : '';
  return apiClient.get<Attribute[]>(`/api/teams/${teamId}/attributes${params}`);
}

/**
 * Create an attribute
 */
export async function createAttribute(
  teamId: string,
  data: Partial<Attribute>
): Promise<Attribute> {
  return apiClient.post<Attribute>(`/api/teams/${teamId}/attributes`, data);
}

/**
 * Update an attribute
 */
export async function updateAttribute(
  attributeId: string,
  data: Partial<Attribute>
): Promise<Attribute> {
  return apiClient.patch<Attribute>(`/api/attributes/${attributeId}`, data);
}

/**
 * Delete an attribute
 */
export async function deleteAttribute(attributeId: string): Promise<void> {
  return apiClient.delete<void>(`/api/attributes/${attributeId}`);
}

/**
 * Get single attribute by id
 */
export async function getAttribute(attributeId: string): Promise<Attribute> {
  return apiClient.get<Attribute>(`/api/attributes/${attributeId}`);
}

/**
 * Get attributes for a step
 */
export async function getStepAttributes(stepId: string): Promise<StepAttribute[]> {
  return apiClient.get<StepAttribute[]>(`/api/steps/${stepId}/attributes`);
}

/**
 * Add an attribute to a step
 */
export async function addAttributeToStep(
  stepId: string,
  attributeId: string,
  relationshipType = 'primary'
): Promise<StepAttribute> {
  return apiClient.post<StepAttribute>(`/api/steps/${stepId}/attributes`, {
    attribute_definition_id: attributeId,
    relationship_type: relationshipType,
  });
}

/**
 * Remove an attribute from a step
 */
export async function removeAttributeFromStep(
  stepId: string,
  attributeId: string
): Promise<void> {
  return apiClient.delete<void>(
    `/api/steps/${stepId}/attributes/${attributeId}`
  );
}

/**
 * Get personas for an attribute (must be actor type)
 */
export async function getPersonasForAttribute(
  attributeId: string
): Promise<Persona[]> {
  return apiClient.get<Persona[]>(`/api/attributes/${attributeId}/personas`);
}

/**
 * Create a persona for an attribute
 */
export async function createPersona(
  attributeId: string,
  data: Partial<Persona>
): Promise<Persona> {
  return apiClient.post<Persona>(`/api/attributes/${attributeId}/personas`, data);
}

/**
 * Update a persona
 */
export async function updatePersona(
  personaId: string,
  data: Partial<Persona>
): Promise<Persona> {
  return apiClient.patch<Persona>(`/api/personas/${personaId}`, data);
}

/**
 * Delete a persona
 */
export async function deletePersona(personaId: string): Promise<void> {
  return apiClient.delete<void>(`/api/personas/${personaId}`);
}

