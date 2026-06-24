/**
 * InventoryIcon.tsx — placeholder glyph for "this belongs to / returns to the standing inventory (Katalog)".
 *
 * A single swap point for the inventory motif so every call site doesn't need
 * to be hunted down individually once a custom icon replaces the Ionicons stand-in.
 *
 * Connections:
 *   Imports → @expo/vector-icons
 *   Used by → components/ShoppingRow.tsx
 *   Data    → none
 *
 * Edit notes:
 *   - Cardboard-box glyph (MaterialCommunityIcons "package-variant-closed") — swap
 *     the name here when a custom icon is ready, not at each call site.
 */
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  size?: number;
  color: string;
};

export default function InventoryIcon({ size = 18, color }: Props) {
  return <MaterialCommunityIcons name="package-variant-closed" size={size} color={color} />;
}
