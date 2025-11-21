/**
 * Attribute Type Constants
 * Centralized definitions for attribute types, icons, colors, and labels
 */

import {
  User,
  Lightning,
  Cube,
  WifiHigh,
  Gear,
  Storefront,
  TextAa,
} from '@phosphor-icons/react';
import type { AttributeType } from '../../types';

/**
 * Base attribute type information
 */
export interface AttributeTypeInfo {
  icon: React.ComponentType<any> | null;
  colorHex: string;
  darkColorHex?: string;
  label: string;
}

/**
 * Attribute type labels
 */
export const ATTRIBUTE_TYPE_LABELS: Record<string, string> = {
  actor: 'Actors',
  action: 'Actions',
  thing: 'Things',
  channel: 'Channels',
  system: 'Systems',
  place: 'Places',
  word: 'Words',
};

/**
 * Base attribute type map with icons and colors
 */
export const ATTRIBUTE_TYPE_INFO: Record<string, AttributeTypeInfo> = {
  actor: {
    icon: User,
    colorHex: '#2563EB',
    darkColorHex: '#60A5FA',
    label: ATTRIBUTE_TYPE_LABELS.actor,
  },
  action: {
    icon: Lightning,
    colorHex: '#16A34A',
    darkColorHex: '#4ADE80',
    label: ATTRIBUTE_TYPE_LABELS.action,
  },
  thing: {
    icon: Cube,
    colorHex: '#4F46E5',
    darkColorHex: '#A78BFA',
    label: ATTRIBUTE_TYPE_LABELS.thing,
  },
  channel: {
    icon: WifiHigh,
    colorHex: '#EA580C',
    darkColorHex: '#FB923C',
    label: ATTRIBUTE_TYPE_LABELS.channel,
  },
  system: {
    icon: Gear,
    colorHex: '#DB2777',
    darkColorHex: '#F472B6',
    label: ATTRIBUTE_TYPE_LABELS.system,
  },
  place: {
    icon: Storefront,
    colorHex: '#EAB308',
    darkColorHex: '#FCD34D',
    label: ATTRIBUTE_TYPE_LABELS.place,
  },
  word: {
    icon: TextAa,
    colorHex: '#374151',
    darkColorHex: '#D1D5DB',
    label: ATTRIBUTE_TYPE_LABELS.word,
  },
};

/**
 * Default attribute type info
 */
export const DEFAULT_ATTRIBUTE_TYPE_INFO: AttributeTypeInfo = {
  icon: TextAa,
  colorHex: '#6B7280',
  darkColorHex: '#9CA3AF',
  label: 'Unknown',
};

/**
 * Get attribute type info by type key
 */
export function getAttributeTypeInfo(typeKey: string): AttributeTypeInfo {
  return ATTRIBUTE_TYPE_INFO[typeKey.toLowerCase()] || DEFAULT_ATTRIBUTE_TYPE_INFO;
}

