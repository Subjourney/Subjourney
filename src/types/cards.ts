/**
 * Card system types
 * Modular, plugin-based card system with JSON Schema validation
 */

import type { EntityId, Timestamp, BaseEntity, JSONSchema, JSONB } from './common';

/**
 * Module - Plugin module that provides card types
 */
export interface Module extends BaseEntity {
  name: string; // Unique identifier (e.g., 'blueprint', 'jira')
  display_name: string;
  description?: string;
  version: string;
  enabled: boolean;
  config: JSONB; // Module-specific configuration
  metadata: JSONB; // Additional module metadata
  icon?: string; // Icon identifier
  color?: string; // Hex color code
}

/**
 * Card Type - Definition of a card type within a module
 */
export interface CardType extends BaseEntity {
  module_id: EntityId;
  name: string; // Unique within module (e.g., 'touchpoint', 'opportunity')
  display_name: string;
  description?: string;
  icon?: string; // Icon identifier
  color?: string; // Hex color code
  schema: JSONSchema; // JSON Schema for validating card data
  ui_config: JSONB; // UI rendering configuration
  enabled: boolean;
  sort_order: number; // Display order in UI
}

/**
 * Card Integration - External integration for a card (Jira, GitHub, etc.)
 */
export interface CardIntegration extends BaseEntity {
  card_id: EntityId;
  integration_type: string; // 'jira', 'github', 'linear', etc.
  external_id: string; // External resource ID
  external_url?: string; // Link to external resource
  external_data: JSONB; // Cached external data
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: Timestamp;
  sync_error?: string; // Error message if sync failed
}

/**
 * Team Module Settings - Team-specific module configuration
 */
export interface TeamModuleSettings extends BaseEntity {
  team_id: EntityId;
  module_id: EntityId;
  enabled: boolean;
  settings: JSONB; // Team-specific module settings
}

/**
 * Card data structure (re-exported from domain for convenience)
 */
export interface Card {
  id: EntityId;
  step_id: EntityId;
  card_type_id: EntityId;
  data: Record<string, unknown>; // Validated by card type schema
  position: number;
  team_id: EntityId;
  created_by?: EntityId;
  created_at: Timestamp;
  updated_at: Timestamp;
}

