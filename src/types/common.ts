/**
 * Common types and utilities used throughout the application
 */

/**
 * UUID string type for entity IDs
 */
export type EntityId = string;

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Processing status enum
 */
export type ProcessingStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Processing session type enum
 */
export type ProcessingSessionType = 'document_processing' | 'ai_analysis';

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: EntityId;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Team-scoped entity interface
 */
export interface TeamScopedEntity extends BaseEntity {
  team_id: EntityId;
}

/**
 * JSON Schema type (simplified - can be extended)
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Generic JSONB data type
 */
export type JSONB = Record<string, unknown> | unknown[] | null;

