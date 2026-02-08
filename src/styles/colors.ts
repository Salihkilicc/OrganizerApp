export type Palette = {
  background: string;
  text: string;
  card: string;
  accent: string;
  border: string;
  tint: string;
};

const base = {
  deepPurple: '#2E1065', // Dark violet
  vividPurple: '#7C3AED', // Bright purple accent
  navyBlue: '#172554',   // Deep sea blue
  electricBlue: '#3B82F6', // Bright blue accent
  white: '#FFFFFF',
  whiteSoft: 'rgba(255, 255, 255, 0.8)',
  whiteGlass: 'rgba(255, 255, 255, 0.15)', // For glass effect on dark
  blackGlass: 'rgba(0, 0, 0, 0.3)', // For darker glass
};

export const themes = {
  default: {
    background: base.deepPurple,
    text: base.white,
    card: base.whiteGlass,
    accent: base.vividPurple,
    border: 'rgba(255, 255, 255, 0.1)',
    tint: base.vividPurple,
  },
  light: {
    background: base.white,
    text: base.navyBlue,
    card: '#F3F4F6',
    accent: base.electricBlue,
    border: 'rgba(0, 0, 0, 0.1)',
    tint: base.electricBlue,
  },
  dark: {
    background: base.deepPurple,
    text: base.white,
    card: base.whiteGlass,
    accent: base.vividPurple,
    border: 'rgba(255, 255, 255, 0.1)',
    tint: base.vividPurple,
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
  primaryBg: [base.deepPurple, base.navyBlue], // Main screen background
  accentCard: [base.vividPurple, base.electricBlue], // Highlights
} as const;
