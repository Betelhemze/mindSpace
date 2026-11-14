import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  AppTheme,
  ThemeId,
  ColorMode,
  FontFamilyChoice,
  FontSizeChoice,
  PRESET_THEMES,
  WARM_BEIGE_THEME,
  DARK_THEME,
  createCustomTheme,
  FONT_FAMILY_MAP,
  FONT_SIZE_SCALES,
} from '@/constants/themes';
import { getRepositories } from '@/database';

interface ThemeContextType {
  theme: AppTheme;
  themeId: ThemeId;
  colorMode: ColorMode;
  resolvedColorMode: 'light' | 'dark';
  customColor: string | null;
  fontFamily: FontFamilyChoice;
  readingFontSize: FontSizeChoice;
  writingFontSize: FontSizeChoice;
  readingScale: number;
  writingScale: number;
  setThemeId: (id: ThemeId) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
  setCustomColor: (color: string | null) => Promise<void>;
  setFontFamily: (font: FontFamilyChoice) => Promise<void>;
  setReadingFontSize: (size: FontSizeChoice) => Promise<void>;
  setWritingFontSize: (size: FontSizeChoice) => Promise<void>;
  resetAppearance: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: WARM_BEIGE_THEME,
  themeId: 'warm-beige',
  colorMode: 'system',
  resolvedColorMode: 'light',
  customColor: null,
  fontFamily: 'system',
  readingFontSize: 'medium',
  writingFontSize: 'medium',
  readingScale: 1.0,
  writingScale: 1.0,
  setThemeId: async () => {},
  setColorMode: async () => {},
  setCustomColor: async () => {},
  setFontFamily: async () => {},
  setReadingFontSize: async () => {},
  setWritingFontSize: async () => {},
  resetAppearance: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  const [themeId, setThemeIdState] = useState<ThemeId>('warm-beige');
  const [colorMode, setColorModeState] = useState<ColorMode>('system');
  const [customColor, setCustomColorState] = useState<string | null>(null);
  const [fontFamily, setFontFamilyState] = useState<FontFamilyChoice>('system');
  const [readingFontSize, setReadingFontSizeState] = useState<FontSizeChoice>('medium');
  const [writingFontSize, setWritingFontSizeState] = useState<FontSizeChoice>('medium');

  // Load preferences from SQLite on mount
  useEffect(() => {
    let isMounted = true;
    async function loadThemeSettings() {
      try {
        const repos = await getRepositories();
        const settings = await repos.settings.getAllSettings();
        if (isMounted) {
          setThemeIdState(settings.appTheme);
          setColorModeState(settings.colorMode);
          setCustomColorState(settings.customThemeColor);
          setFontFamilyState(settings.fontFamily);
          setReadingFontSizeState(settings.readingFontSize);
          setWritingFontSizeState(settings.writingFontSize);
        }
      } catch (err) {
        console.warn('[ThemeProvider] Error loading theme preferences:', err);
      }
    }
    loadThemeSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine whether effective display mode is dark or light
  const resolvedColorMode: 'light' | 'dark' = useMemo(() => {
    if (colorMode === 'dark') return 'dark';
    if (colorMode === 'light') return 'light';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [colorMode, systemColorScheme]);

  // Compute active theme
  const theme = useMemo<AppTheme>(() => {
    let baseTheme: AppTheme;

    if (customColor) {
      baseTheme = createCustomTheme(customColor, resolvedColorMode === 'dark');
    } else if (resolvedColorMode === 'dark' && themeId !== 'dark') {
      // In dark mode, adapt preset or use dark theme
      baseTheme = DARK_THEME;
    } else {
      baseTheme = PRESET_THEMES[themeId] || WARM_BEIGE_THEME;
    }

    // Apply configured typography font family and scaling
    const activeFontFamilies = FONT_FAMILY_MAP[fontFamily] || FONT_FAMILY_MAP.system;
    const readingScale = FONT_SIZE_SCALES[readingFontSize] || 1.0;

    return {
      ...baseTheme,
      typography: {
        ...baseTheme.typography,
        fontFamilies: activeFontFamilies,
        sizes: {
          xs: Math.round(baseTheme.typography.sizes.xs * readingScale),
          sm: Math.round(baseTheme.typography.sizes.sm * readingScale),
          body: Math.round(baseTheme.typography.sizes.body * readingScale),
          bodyLarge: Math.round(baseTheme.typography.sizes.bodyLarge * readingScale),
          title: Math.round(baseTheme.typography.sizes.title * readingScale),
          header: Math.round(baseTheme.typography.sizes.header * readingScale),
          display: Math.round(baseTheme.typography.sizes.display * readingScale),
        },
      },
    };
  }, [themeId, resolvedColorMode, customColor, fontFamily, readingFontSize]);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    setCustomColorState(null);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ appTheme: id, customThemeColor: null });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist themeId:', err);
    }
  }, []);

  const setColorMode = useCallback(async (mode: ColorMode) => {
    setColorModeState(mode);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ colorMode: mode });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist colorMode:', err);
    }
  }, []);

  const setCustomColor = useCallback(async (color: string | null) => {
    setCustomColorState(color);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ customThemeColor: color });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist customColor:', err);
    }
  }, []);

  const setFontFamily = useCallback(async (font: FontFamilyChoice) => {
    setFontFamilyState(font);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ fontFamily: font });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist fontFamily:', err);
    }
  }, []);

  const setReadingFontSize = useCallback(async (size: FontSizeChoice) => {
    setReadingFontSizeState(size);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ readingFontSize: size });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist readingFontSize:', err);
    }
  }, []);

  const setWritingFontSize = useCallback(async (size: FontSizeChoice) => {
    setWritingFontSizeState(size);
    try {
      const repos = await getRepositories();
      await repos.settings.updateSettings({ writingFontSize: size });
    } catch (err) {
      console.warn('[ThemeProvider] Failed to persist writingFontSize:', err);
    }
  }, []);

  const resetAppearance = useCallback(async () => {
    setThemeIdState('warm-beige');
    setColorModeState('system');
    setCustomColorState(null);
    setFontFamilyState('system');
    setReadingFontSizeState('medium');
    setWritingFontSizeState('medium');
    try {
      const repos = await getRepositories();
      await repos.settings.resetAppearanceSettings();
    } catch (err) {
      console.warn('[ThemeProvider] Failed to reset appearance settings:', err);
    }
  }, []);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      themeId,
      colorMode,
      resolvedColorMode,
      customColor,
      fontFamily,
      readingFontSize,
      writingFontSize,
      readingScale: FONT_SIZE_SCALES[readingFontSize] || 1.0,
      writingScale: FONT_SIZE_SCALES[writingFontSize] || 1.0,
      setThemeId,
      setColorMode,
      setCustomColor,
      setFontFamily,
      setReadingFontSize,
      setWritingFontSize,
      resetAppearance,
    }),
    [
      theme,
      themeId,
      colorMode,
      resolvedColorMode,
      customColor,
      fontFamily,
      readingFontSize,
      writingFontSize,
      setThemeId,
      setColorMode,
      setCustomColor,
      setFontFamily,
      setReadingFontSize,
      setWritingFontSize,
      resetAppearance,
    ]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

