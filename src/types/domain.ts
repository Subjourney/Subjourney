/**
 * Core domain entity types
 * These represent the main business entities in the Subjourney application
 */

import type { EntityId, Timestamp, TeamScopedEntity, BaseEntity } from './common';

/**
 * Team - Multi-tenant organization unit
 */
export interface Team extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

/**
 * Team membership - Links users to teams with roles
 */
export interface TeamMembership extends BaseEntity {
  user_id: EntityId;
  team_id: EntityId;
  role: string; // e.g., 'member', 'admin', 'owner'
  is_owner: boolean;
}

/**
 * Project - Grouping of journeys within a team
 */
export interface Project extends TeamScopedEntity {
  name: string;
  description?: string;
}

/**
 * Journey - Main journey map (can be a subjourney)
 */
export interface Journey extends TeamScopedEntity {
  project_id: EntityId;
  name: string;
  description?: string;
  summary?: string;
  is_subjourney: boolean;
  parent_step_id?: EntityId; // For subjourneys - references the parent step
  continue_step_id?: EntityId; // Optional explicit continuation step when this journey finishes
  
  // Denormalized fields for UI (populated by API)
  allPhases?: Phase[];
  allSteps?: Step[];
  allCards?: Card[];
  subjourneys?: Journey[];
}

/**
 * Phase - Horizontal grouping within a journey
 */
export interface Phase extends TeamScopedEntity {
  journey_id: EntityId;
  name: string;
  sequence_order: number;
  color: string; // Hex color code (e.g., '#3B82F6')
  is_subjourney: boolean;
}

/**
 * Step - Individual touchpoint within a phase
 */
export interface Step extends TeamScopedEntity {
  phase_id: EntityId;
  name: string;
  description?: string;
  sequence_order: number;
  subjourney_id?: EntityId; // Legacy field - use journey.parent_step_id instead
  is_subjourney: boolean;
  comment_count?: number; // Denormalized from comments table
  last_comment_at?: Timestamp; // Denormalized from comments table
}

/**
 * Card - Modular card attached to a step
 * Note: Full card type definition is in types/cards.ts
 */
export interface Card extends TeamScopedEntity {
  step_id: EntityId;
  card_type_id: EntityId;
  data: Record<string, unknown>; // Validated by card type schema
  position: number; // Display order within step
  created_by?: EntityId; // User who created the card
}

