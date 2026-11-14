export type ThemeId =
  | 'warm-beige'
  | 'sage-green'
  | 'soft-blue'
  | 'lavender'
  | 'rose'
  | 'neutral-sand'
  | 'mint'
  | 'dark';

export type ColorMode = 'light' | 'dark' | 'system';

export type FontFamilyChoice = 'system' | 'serif' | 'monospace';

export type FontSizeChoice = 'small' | 'medium' | 'large' | 'extraLarge';

export interface ThemeColors {
  // Main background
  background: string;
  // Card and surface colors
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;

  // Primary & brand tokens
  primary: string;
  secondary: string;
  accent: string;
  accentLight: string;
  accentSubtle: string;

  // Typography colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;

  // Borders & dividers
  border: string;
  borderLight: string;

  // Status indicators
  success: string;
  error: string;
  statusSaved: string;
  statusDraft: string;
  statusError: string;
  statusDraftBg: string;
  statusSavedBg: string;

  // Navigation & interaction
  activeTab: string;
  inactiveTab: string;
  cardPressed: string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  typography: {
    fontFamilies: {
      regular: string;
      medium: string;
      bold: string;
    };
    sizes: {
      xs: number;
      sm: number;
      body: number;
      bodyLarge: number;
      title: number;
      header: number;
      display: number;
    };
    lineHeights: {
      body: number;
      bodyLarge: number;
      title: number;
      header: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    floating: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

export const FONT_FAMILY_MAP: Record<FontFamilyChoice, { regular: string; medium: string; bold: string }> = {
  system: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  serif: {
    regular: 'serif',
    medium: 'serif',
    bold: 'serif',
  },
  monospace: {
    regular: 'monospace',
    medium: 'monospace',
    bold: 'monospace',
  },
};

export const FONT_SIZE_SCALES: Record<FontSizeChoice, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
  extraLarge: 1.3,
};

const BASE_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const BASE_RADII = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
};

// 1. Warm Beige (Default Mindspace theme)
export const WARM_BEIGE_THEME: AppTheme = {
  id: 'warm-beige',
  name: 'Warm Beige',
  isDark: false,
  colors: {
    background: '#FBF9F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4EFE6',
    surfaceElevated: '#FFFFFF',
    primary: '#4A4036',
    secondary: '#7D7063',
    accent: '#4A4036',
    accentLight: '#7D7063',
    accentSubtle: '#EAE4D9',
    textPrimary: '#1F2022',
    textSecondary: '#5C5D60',
    textMuted: '#8C8D91',
    textPlaceholder: '#A3A4A8',
    border: '#E8E2D5',
    borderLight: '#F0ECE3',
    success: '#2E6930',
    error: '#A83232',
    statusSaved: '#2E6930',
    statusDraft: '#B2641B',
    statusError: '#A83232',
    statusDraftBg: '#FFF7ED',
    statusSavedBg: '#F0FDF4',
    activeTab: '#1F2022',
    inactiveTab: '#8C8D91',
    cardPressed: '#F8F5EE',
  },
  typography: {
    fontFamilies: FONT_FAMILY_MAP.system,
    sizes: {
      xs: 11,
      sm: 13,
      body: 15,
      bodyLarge: 17,
      title: 20,
      header: 26,
      display: 32,
    },
    lineHeights: {
      body: 24,
      bodyLarge: 28,
      title: 28,
      header: 34,
    },
  },
  spacing: BASE_SPACING,
  radii: BASE_RADII,
  shadows: {
    card: {
      shadowColor: '#1F2022',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    floating: {
      shadowColor: '#1F2022',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

// 2. Sage Green
export const SAGE_GREEN_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'sage-green',
  name: 'Sage Green',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#F6F8F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#ECF1EA',
    surfaceElevated: '#FFFFFF',
    primary: '#3B5240',
    secondary: '#5C7462',
    accent: '#3B5240',
    accentLight: '#5C7462',
    accentSubtle: '#DCE6DC',
    textPrimary: '#1E2B20',
    textSecondary: '#4A5B4D',
    border: '#DEE6DC',
    borderLight: '#EBF0E9',
    activeTab: '#3B5240',
    cardPressed: '#F0F4EF',
  },
};

// 3. Soft Blue
export const SOFT_BLUE_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'soft-blue',
  name: 'Soft Blue',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceSubtle: '#EBF1F7',
    surfaceElevated: '#FFFFFF',
    primary: '#33506E',
    secondary: '#577394',
    accent: '#33506E',
    accentLight: '#577394',
    accentSubtle: '#D7E3F0',
    textPrimary: '#1B2937',
    textSecondary: '#475C73',
    border: '#D9E3EE',
    borderLight: '#E8EFF7',
    activeTab: '#33506E',
    cardPressed: '#EEF3F9',
  },
};

// 4. Lavender
export const LAVENDER_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'lavender',
  name: 'Lavender',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#F9F7FB',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1ECF7',
    surfaceElevated: '#FFFFFF',
    primary: '#56426C',
    secondary: '#7A6492',
    accent: '#56426C',
    accentLight: '#7A6492',
    accentSubtle: '#E5DCF0',
    textPrimary: '#2B2037',
    textSecondary: '#57466D',
    border: '#E4DBEF',
    borderLight: '#EFEAF6',
    activeTab: '#56426C',
    cardPressed: '#F4F0F9',
  },
};

// 5. Rose
export const ROSE_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'rose',
  name: 'Rose',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#FBF7F7',
    surface: '#FFFFFF',
    surfaceSubtle: '#F7EDED',
    surfaceElevated: '#FFFFFF',
    primary: '#6D3F43',
    secondary: '#915F64',
    accent: '#6D3F43',
    accentLight: '#915F64',
    accentSubtle: '#F0DCDC',
    textPrimary: '#371E21',
    textSecondary: '#6B4549',
    border: '#EEDCDC',
    borderLight: '#F7ECEC',
    activeTab: '#6D3F43',
    cardPressed: '#F7EFEF',
  },
};

// 6. Neutral Sand
export const NEUTRAL_SAND_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'neutral-sand',
  name: 'Neutral Sand',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#F8F7F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#EFECE7',
    surfaceElevated: '#FFFFFF',
    primary: '#423F3C',
    secondary: '#696561',
    accent: '#423F3C',
    accentLight: '#696561',
    accentSubtle: '#E4E0D9',
    textPrimary: '#1E1D1B',
    textSecondary: '#53504C',
    border: '#E3DFD9',
    borderLight: '#ECE9E3',
    activeTab: '#423F3C',
    cardPressed: '#F2EFEA',
  },
};

// 7. Mint
export const MINT_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'mint',
  name: 'Mint',
  isDark: false,
  colors: {
    ...WARM_BEIGE_THEME.colors,
    background: '#F4F9F7',
    surface: '#FFFFFF',
    surfaceSubtle: '#E5F3EE',
    surfaceElevated: '#FFFFFF',
    primary: '#2B584B',
    secondary: '#4A796B',
    accent: '#2B584B',
    accentLight: '#4A796B',
    accentSubtle: '#D0EAE1',
    textPrimary: '#142E26',
    textSecondary: '#396053',
    border: '#D3E9E1',
    borderLight: '#E3F2EC',
    activeTab: '#2B584B',
    cardPressed: '#ECF6F2',
  },
};

// 8. Dark Theme (Deep Charcoal / Slate)
export const DARK_THEME: AppTheme = {
  ...WARM_BEIGE_THEME,
  id: 'dark',
  name: 'Dark',
  isDark: true,
  colors: {
    background: '#141517',
    surface: '#1E2023',
    surfaceSubtle: '#26282D',
    surfaceElevated: '#2A2D33',
    primary: '#E5E1DB',
    secondary: '#A39F98',
    accent: '#D4CEBF',
    accentLight: '#B8B1A0',
    accentSubtle: '#33363D',
    textPrimary: '#F2EFEB',
    textSecondary: '#A9A6A1',
    textMuted: '#73706A',
    textPlaceholder: '#595652',
    border: '#2E3137',
    borderLight: '#26292E',
    success: '#4ADE80',
    error: '#F87171',
    statusSaved: '#4ADE80',
    statusDraft: '#FBBF24',
    statusError: '#F87171',
    statusDraftBg: '#2E2616',
    statusSavedBg: '#182E20',
    activeTab: '#F2EFEB',
    inactiveTab: '#73706A',
    cardPressed: '#272A30',
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};

export const PRESET_THEMES: Record<ThemeId, AppTheme> = {
  'warm-beige': WARM_BEIGE_THEME,
  'sage-green': SAGE_GREEN_THEME,
  'soft-blue': SOFT_BLUE_THEME,
  'lavender': LAVENDER_THEME,
  'rose': ROSE_THEME,
  'neutral-sand': NEUTRAL_SAND_THEME,
  'mint': MINT_THEME,
  'dark': DARK_THEME,
};

/**
 * Creates a dynamic palette based on a custom hex accent color.
 */
export function createCustomTheme(accentHex: string, isDark: boolean = false): AppTheme {
  // Normalize hex
  const cleanHex = accentHex.startsWith('#') ? accentHex : `#${accentHex}`;

  if (isDark) {
    return {
      ...DARK_THEME,
      id: 'dark',
      name: 'Custom Dark',
      colors: {
        ...DARK_THEME.colors,
        accent: cleanHex,
        accentLight: cleanHex,
        primary: cleanHex,
        activeTab: cleanHex,
      },
    };
  }

  return {
    ...WARM_BEIGE_THEME,
    id: 'warm-beige',
    name: 'Custom',
    colors: {
      ...WARM_BEIGE_THEME.colors,
      primary: cleanHex,
      accent: cleanHex,
      accentLight: cleanHex,
      activeTab: cleanHex,
    },
  };
}

