import { WARM_BEIGE_THEME, AppTheme } from './themes';

/**
 * Default fallback theme instance for backward compatibility with static imports.
 * New components should use the dynamic `useTheme()` hook from `@/context/ThemeContext`.
 */
export const theme: AppTheme = WARM_BEIGE_THEME;

export type Theme = typeof theme;

export * from './themes';
