export type Palette = {
  background: string;
  text: string;
  card: string;
  accent: string;
  border: string;
  tint: string;
};

const base = {
  // New dark purple-navy palette
  deepNavy: '#0f0f2e',        // Darkest background
  darkPurple: '#1a1a3e',      // Main background
  cardPurple: '#2d2d5f',      // Card background
  brightBlue: '#4169e1',      // Primary accent
  lightBlue: '#5b7fe8',       // Secondary accent
  white: '#FFFFFF',
  whiteSoft: 'rgba(255, 255, 255, 0.9)',
  whiteGlass: 'rgba(45, 45, 95, 0.6)', // Purple-tinted glass
  purpleBorder: 'rgba(91, 127, 232, 0.2)', // Blue-purple border
};

export const themes = {
  default: {
    background: base.darkPurple,
    text: base.white,
    card: base.whiteGlass,
    accent: base.brightBlue,
    border: base.purpleBorder,
    tint: base.lightBlue,
  },
  light: {
    background: base.white,
    text: base.darkPurple,
    card: '#F3F4F6',
    accent: base.brightBlue,
    border: 'rgba(0, 0, 0, 0.1)',
    tint: base.brightBlue,
  },
  dark: {
    background: base.darkPurple,
    text: base.white,
    card: base.whiteGlass,
    accent: base.brightBlue,
    border: base.purpleBorder,
    tint: base.lightBlue,
  },
  ninja: {
    background: '#0b0c10',
    text: '#c5c6c7',
    card: '#1f2833',
    accent: '#66fcf1',
    border: '#45a29e',
    tint: '#66fcf1',
  },
  classic: {
    background: '#F4F6FB',
    text: '#0F172A',
    card: '#FFFFFF',
    accent: '#1D4ED8',
    border: '#CBD5F5',
    tint: '#1D4ED8',
  },
  midnight: {
    background: '#030712',
    text: '#E0E7FF',
    card: '#0F172A',
    accent: '#7C3AED',
    border: '#312E81',
    tint: '#7C3AED',
  },
  forest: {
    background: '#0C1F0E',
    text: '#D9FCE3',
    card: '#132313',
    accent: '#34D399',
    border: '#1F4511',
    tint: '#34D399',
  },
  sunset: {
    background: '#FFF7ED',
    text: '#4C1D1D',
    card: '#FFF1E6',
    accent: '#FB923C',
    border: '#FDBA74',
    tint: '#FB923C',
  },
  ocean: {
    background: '#030D1F',
    text: '#E0F2FE',
    card: '#0F172A',
    accent: '#38BDF8',
    border: '#1D4ED8',
    tint: '#38BDF8',
  },
  sakura: {
    background: '#FFF3F8',
    text: '#831843',
    card: '#FFE4EC',
    accent: '#EC4899',
    border: '#F472B6',
    tint: '#EC4899',
  },
  neon: {
    background: '#05050A',
    text: '#E0F2FE',
    card: '#0B0D1E',
    accent: '#A855F7',
    border: '#8B5CF6',
    tint: '#A855F7',
  },
  coffee: {
    background: '#1A130F',
    text: '#FDF4E3',
    card: '#2D2118',
    accent: '#FBBF24',
    border: '#7C4D0A',
    tint: '#FBBF24',
  },
  minimal: {
    background: '#F8FAFC',
    text: '#0F172A',
    card: '#F1F5F9',
    accent: '#475569',
    border: '#E2E8F0',
    tint: '#475569',
  },
} as const;

export const gradients = {
  primaryBg: [base.darkPurple, base.deepNavy], // Main screen background gradient
  accentCard: [base.brightBlue, base.lightBlue], // Button gradients
} as const;
