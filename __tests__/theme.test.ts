import {
  PRESET_THEMES,
  WARM_BEIGE_THEME,
  DARK_THEME,
  createCustomTheme,
  FONT_FAMILY_MAP,
  FONT_SIZE_SCALES,
  ThemeId,
} from '@/constants/themes';

describe('Theme Customization System', () => {
  const PRESET_IDS: ThemeId[] = [
    'warm-beige',
    'sage-green',
    'soft-blue',
    'lavender',
    'rose',
    'neutral-sand',
    'mint',
    'dark',
  ];

  it('provides all 8 required preset themes with valid tokens', () => {
    expect(PRESET_IDS.length).toBe(8);

    for (const id of PRESET_IDS) {
      const t = PRESET_THEMES[id];
      expect(t).toBeDefined();
      expect(t.id).toBe(id);
      expect(t.name).toBeDefined();
      // Verify core theme color tokens
      expect(t.colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.textPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.success).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.colors.error).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('correctly marks dark theme as isDark=true and light themes as isDark=false', () => {
    expect(DARK_THEME.isDark).toBe(true);
    expect(WARM_BEIGE_THEME.isDark).toBe(false);
  });

  it('generates a custom theme palette from any valid hex code', () => {
    const customHex = '#2563EB';
    const custom = createCustomTheme(customHex, false);

    expect(custom.colors.accent).toBe(customHex);
    expect(custom.colors.primary).toBe(customHex);
    expect(custom.isDark).toBe(false);

    const customDark = createCustomTheme(customHex, true);
    expect(customDark.colors.accent).toBe(customHex);
    expect(customDark.isDark).toBe(true);
  });

  it('provides font family mappings and font size scales', () => {
    expect(FONT_FAMILY_MAP.system).toBeDefined();
    expect(FONT_FAMILY_MAP.serif).toBeDefined();
    expect(FONT_FAMILY_MAP.monospace).toBeDefined();

    expect(FONT_SIZE_SCALES.small).toBeLessThan(FONT_SIZE_SCALES.medium);
    expect(FONT_SIZE_SCALES.medium).toBe(1.0);
    expect(FONT_SIZE_SCALES.large).toBeGreaterThan(FONT_SIZE_SCALES.medium);
    expect(FONT_SIZE_SCALES.extraLarge).toBeGreaterThan(FONT_SIZE_SCALES.large);
  });
});

