/**
 * Phase color palette
 * Colors are assigned to phases in a cycling pattern
 */
export const PHASE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#0EA5E9', // Sky
  '#22C55E', // Green (lighter)
  '#A855F7', // Purple (lighter)
  '#FBBF24', // Yellow
  '#0F766E', // Teal
  '#4F46E5', // Indigo (darker)
] as const;

/**
 * Get a color for a phase based on its index
 * @param index The phase index (0-based)
 * @returns A hex color code
 */
export function getPhaseColor(index: number): string {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

