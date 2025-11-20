/**
 * Mock data utilities
 * Transforms mock JSON data to match our TypeScript types
 */

import type { Journey, Phase, Step } from '../types';

// Import mock data - Vite handles JSON imports
// @ts-expect-error - JSON import
import mockJourneyData from '../../mock-data/mock-journey-data.json';

/**
 * Transform mock JSON data to Journey type
 */
export function getMockJourney(): Journey {
  const data = mockJourneyData;

  // Transform phases
  const allPhases: Phase[] = (data.phases || []).map((phase: unknown) => ({
    id: (phase as { id: string }).id,
    team_id: (phase as { team_id: string }).team_id,
    journey_id: (phase as { journey_id: string }).journey_id,
    name: (phase as { name: string }).name,
    sequence_order: (phase as { sequence_order: number }).sequence_order,
    color: (phase as { color: string }).color,
    is_subjourney: (phase as { is_subjourney: boolean }).is_subjourney || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Transform steps (flatten from phases)
  const allSteps: Step[] = [];
  (data.phases || []).forEach((phase: unknown) => {
    const phaseSteps = (phase as { steps?: unknown[] }).steps || [];
    phaseSteps.forEach((step: unknown) => {
      allSteps.push({
        id: (step as { id: string }).id,
        team_id: (step as { team_id: string }).team_id,
        phase_id: (phase as { id: string }).id,
        name: (step as { name: string }).name,
        description: (step as { description?: string }).description,
        sequence_order: (step as { sequence_order: number }).sequence_order,
        is_subjourney: (step as { is_subjourney: boolean }).is_subjourney || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  });

  // Transform journey
  const journey: Journey = {
    id: data.id,
    team_id: data.team_id,
    project_id: data.project_id,
    name: data.name,
    description: data.description,
    summary: data.summary,
    is_subjourney: data.is_subjourney || false,
    created_at: data.created_at,
    updated_at: data.updated_at,
    allPhases,
    allSteps,
    allCards: [], // No cards in mock data yet
    subjourneys: [], // No subjourneys in mock data yet
  };

  return journey;
}

