/**
 * Attribute system types
 * Tagging system for steps with typed attributes
 */

import type { EntityId, BaseEntity, JSONB } from './common';

/**
 * Attribute type enum
 */
export type AttributeType = 'actor' | 'action' | 'thing' | 'channel' | 'system' | 'place' | 'word';

/**
 * Attribute - Definition of an attribute that can be applied to steps
 */
export interface Attribute extends BaseEntity {
  team_id: EntityId;
  project_id?: EntityId; // Optional - if null, attribute is team-wide
  name: string;
  type: AttributeType;
  description?: string;
  allowed_values?: unknown[]; // JSONB array of allowed values
  is_ai_generated: boolean;
}

/**
 * Step Attribute - Junction table linking steps to attributes
 */
export interface StepAttribute extends BaseEntity {
  step_id: EntityId;
  attribute_definition_id: EntityId; // References attributes.id
  sequence_order: number;
  relationship_type: string; // e.g., 'primary', 'secondary'
}

/**
 * Persona - User persona linked to an actor attribute
 * 
 * Note: Personas are only linked to attributes where type = 'actor'.
 * The attribute_definition_id must reference an Attribute with type = 'actor'.
 */
export interface Persona extends BaseEntity {
  attribute_definition_id: EntityId; // References attributes.id where type = 'actor'
  name: string;
  description?: string;
  avatar_url?: string;
  characteristics: JSONB;
  demographics: JSONB;
  psychographics: JSONB;
  behaviors: JSONB;
  needs: JSONB;
  goals: JSONB;
  motivations: JSONB;
  frustrations: JSONB;
  pain_points: JSONB;
  is_ai_generated: boolean;
  sequence_order: number;
}

