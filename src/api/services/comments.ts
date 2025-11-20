/**
 * Comment API service
 * Type-safe methods for comment operations
 */

import { apiClient } from '../client';
import type { Comment, CommentDetails, CommentReaction } from '../../types';

/**
 * Get comments for a target (journey, phase, or step)
 */
export async function getComments(
  targetType: 'journey' | 'phase' | 'step',
  targetId: string
): Promise<CommentDetails[]> {
  return apiClient.get<CommentDetails[]>(
    `/api/${targetType}s/${targetId}/comments`
  );
}

/**
 * Create a comment
 */
export async function createComment(
  targetType: 'journey' | 'phase' | 'step',
  targetId: string,
  content: string,
  parentCommentId?: string
): Promise<Comment> {
  return apiClient.post<Comment>(`/api/${targetType}s/${targetId}/comments`, {
    content,
    parent_comment_id: parentCommentId,
  });
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<Comment> {
  return apiClient.patch<Comment>(`/api/comments/${commentId}`, { content });
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  return apiClient.delete<void>(`/api/comments/${commentId}`);
}

/**
 * Add a reaction to a comment
 */
export async function addCommentReaction(
  commentId: string,
  reaction: '👍' | '❤️' | '😂' | '😮'
): Promise<CommentReaction> {
  return apiClient.post<CommentReaction>(`/api/comments/${commentId}/reactions`, {
    reaction,
  });
}

/**
 * Remove a reaction from a comment
 */
export async function removeCommentReaction(
  commentId: string,
  reaction: '👍' | '❤️' | '😂' | '😮'
): Promise<void> {
  return apiClient.delete<void>(
    `/api/comments/${commentId}/reactions/${reaction}`
  );
}

