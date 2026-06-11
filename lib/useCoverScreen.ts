/**
 * useCoverScreen.ts — detect Samsung Galaxy Z Flip cover screen viewport
 *
 * Returns isCoverScreen=true when the app renders on the ~360×374dp cover
 * display. The height ≤ 420dp guard excludes all normal portrait phones
 * (the narrowest, iPhone SE, is 375×667dp). Set FORCE_COVER_SCREEN=true to
 * test the cover UI on any device during development.
 *
 * Connections:
 *   Imports → react-native
 *   Used by → app/index.tsx
 *   Data    → none
 */
import { useWindowDimensions } from 'react-native';

const FORCE_COVER_SCREEN = false;

export const COVER_SCREEN_MAX_WIDTH = 390;
export const COVER_SCREEN_MAX_HEIGHT = 420;
export const COVER_SCREEN_MAX_RATIO = 1.2;

export function useCoverScreen(): { isCoverScreen: boolean; width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const isCoverScreen =
    FORCE_COVER_SCREEN ||
    (width <= COVER_SCREEN_MAX_WIDTH &&
      height <= COVER_SCREEN_MAX_HEIGHT &&
      height / width <= COVER_SCREEN_MAX_RATIO);
  return { isCoverScreen, width, height };
}
