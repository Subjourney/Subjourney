/**
 * Card API service
 * Type-safe methods for card operations
 */

import { apiClient } from '../client';
import type { Card, CardType, Module, CardIntegration } from '../../types';

/**
 * Get all cards for a step
 */
export async function getCardsForStep(stepId: string): Promise<Card[]> {
  return apiClient.get<Card[]>(`/api/steps/${stepId}/cards`);
}

/**
 * Create a card on a step
 */
export async function createCard(
  stepId: string,
  data: Partial<Card>
): Promise<Card> {
  return apiClient.post<Card>(`/api/steps/${stepId}/cards`, data);
}

/**
 * Update a card
 */
export async function updateCard(
  cardId: string,
  data: Partial<Card>
): Promise<Card> {
  return apiClient.patch<Card>(`/api/cards/${cardId}`, data);
}

/**
 * Delete a card
 */
export async function deleteCard(cardId: string): Promise<void> {
  return apiClient.delete<void>(`/api/cards/${cardId}`);
}

/**
 * Reorder cards within a step
 */
export async function reorderCards(
  stepId: string,
  cardIds: string[]
): Promise<void> {
  return apiClient.post<void>(`/api/steps/${stepId}/reorder-cards`, {
    card_ids: cardIds,
  });
}

/**
 * Move a card to a different step
 */
export async function moveCardToStep(
  cardId: string,
  targetStepId: string
): Promise<void> {
  return apiClient.post<void>(`/api/cards/${cardId}/move`, {
    step_id: targetStepId,
  });
}

/**
 * Get all available modules
 */
export async function getModules(): Promise<Module[]> {
  return apiClient.get<Module[]>('/api/modules');
}

/**
 * Get all card types for a module
 */
export async function getCardTypes(moduleId: string): Promise<CardType[]> {
  return apiClient.get<CardType[]>(`/api/modules/${moduleId}/card-types`);
}

/**
 * Get all card types
 */
export async function getAllCardTypes(): Promise<CardType[]> {
  return apiClient.get<CardType[]>('/api/card-types');
}

/**
 * Get card integrations for a card
 */
export async function getCardIntegrations(
  cardId: string
): Promise<CardIntegration[]> {
  return apiClient.get<CardIntegration[]>(`/api/cards/${cardId}/integrations`);
}

/**
 * Create a card integration
 */
export async function createCardIntegration(
  cardId: string,
  data: Partial<CardIntegration>
): Promise<CardIntegration> {
  return apiClient.post<CardIntegration>(
    `/api/cards/${cardId}/integrations`,
    data
  );
}

