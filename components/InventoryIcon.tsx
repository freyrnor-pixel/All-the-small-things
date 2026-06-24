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
 *   - Placeholder only (per product note) — swap the Ionicons name here when a
 *     real icon is ready, not at each call site.
 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  size?: number;
  color: string;
};

export default function InventoryIcon({ size = 18, color }: Props) {
  return <Ionicons name="cube" size={size} color={color} />;
}
