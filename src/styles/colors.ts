export type Palette = {
  background: string;
  text: string;
  card: string;
  accent: string;
  border: string;
};

export const themes = {
  light: {
    background: '#FFFFFF',
    text: '#111827',
    card: '#F3F4F6',
    accent: '#3B82F6',
    border: '#E5E7EB',
  },
  dark: {
    background: '#0F172A',
    text: '#E5E7EB',
    card: '#1F2937',
    accent: '#60A5FA',
    border: '#374151',
  },
  ninja: {
    background: '#0b0c10',
    text: '#c5c6c7',
    card: '#1f2833',
    accent: '#66fcf1',
    border: '#45a29e',
  },
} as const;
