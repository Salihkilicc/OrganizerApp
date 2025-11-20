export type Palette = {
  background: string;
  text: string;
  card: string;
  accent: string;
  border: string;
  tint: string;
};

export const themes = {
  default: {
    background: '#F9FAFB',
    text: '#111827',
    card: '#FFFFFF',
    accent: '#2563EB',
    border: '#E5E7EB',
    tint: '#2563EB',
  },
  light: {
    background: '#F3F4F6',
    text: '#111827',
    card: '#FFFFFF',
    accent: '#3B82F6',
    border: '#E5E7EB',
    tint: '#3B82F6',
  },
  dark: {
    background: '#0F172A',
    text: '#E5E7EB',
    card: '#1F2937',
    accent: '#60A5FA',
    border: '#374151',
    tint: '#60A5FA',
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
