export const theme = {
  colors: {
    // Warm cream / off-white palette
    background: '#FBF9F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4EFE6',
    surfaceElevated: '#FFFFFF',
    
    // Charcoal typography
    textPrimary: '#1F2022',
    textSecondary: '#5C5D60',
    textMuted: '#8C8D91',
    textPlaceholder: '#A3A4A8',
    
    // Natural warm accents
    accent: '#4A4036',
    accentLight: '#7D7063',
    accentSubtle: '#EAE4D9',
    
    // Borders and dividers
    border: '#E8E2D5',
    borderLight: '#F0ECE3',
    
    // Status indicators (warm, non-jarring)
    statusSaved: '#2E6930',
    statusDraft: '#B2641B',
    statusError: '#A83232',
    statusDraftBg: '#FFF7ED',
    statusSavedBg: '#F0FDF4',
    
    // Interactive states
    activeTab: '#1F2022',
    inactiveTab: '#8C8D91',
    cardPressed: '#F8F5EE',
  },
  typography: {
    fontFamilies: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
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
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 22,
    full: 9999,
  },
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
} as const;

export type Theme = typeof theme;

