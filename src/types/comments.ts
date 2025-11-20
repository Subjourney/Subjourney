/**
 * Comment system types
 * Comments on journeys, phases, and steps with threading support
 */

import type { EntityId, Timestamp, BaseEntity } from './common';

/**
 * Comment target type
 */
export type CommentTargetType = 'journey' | 'phase' | 'step';

/**
 * Comment reaction type
 */
export type CommentReaction = '👍' | '❤️' | '😂' | '😮';

/**
 * Comment - Comment on a journey, phase, or step
 */
export interface Comment extends BaseEntity {
  content: string;
  author_id: EntityId;
  target_type: CommentTargetType;
  target_id: EntityId;
  parent_comment_id?: EntityId; // For threaded replies (NULL for root comments)
}

/**
 * Comment Reaction - Emoji reaction on a comment
 */
export interface CommentReaction {
  id: EntityId;
  comment_id: EntityId;
  user_id: EntityId;
  reaction: CommentReaction;
  created_at: Timestamp;
}

/**
 * Comment Details - Extended comment with author info and reactions
 * This matches the comment_details view from the database
 */
export interface CommentDetails extends Comment {
  author_name?: string;
  author_email?: string;
  reactions: Array<{
    reaction: CommentReaction;
    count: number;
    has_reacted: boolean;
  }>;
  reaction_details: Array<{
    reaction: CommentReaction;
    user: {
      id: EntityId;
      name?: string;
      email: string;
    };
  }>;
}

