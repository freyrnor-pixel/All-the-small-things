/**
 * AppLogo.tsx — Blue tree mark used as UnFocus's onboarding logo.
 *
 * Connections:
 *   Imports → @expo/vector-icons (MaterialCommunityIcons), @/constants/theme
 *   Used by → app/onboarding/language.tsx, app/onboarding/index.tsx
 *   Data    → none (presentational)
 *
 * Edit notes:
 *   - Colour is fixed blue regardless of the user's chosen colour theme — it's a brand mark, not themed UI.
 */
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

type Props = { size?: number };

export default function AppLogo({ size = 64 }: Props) {
  return <MaterialCommunityIcons name="tree" size={size} color={Colors.orange} />;
}
