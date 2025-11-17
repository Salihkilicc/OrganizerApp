export type FrameDecoration = {
  borderColor: string;
  borderWidth: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
  elevation?: number;
};

export const FRAME_STYLES: Record<string, FrameDecoration> = {
  'frame-simple': {
    borderColor: '#94a3b8',
    borderWidth: 2,
    shadowColor: '#94a3b8',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  'frame-silver': {
    borderColor: '#cbd5f5',
    borderWidth: 3,
    shadowColor: '#cbd5f5',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  'frame-gold': {
    borderColor: '#fbbf24',
    borderWidth: 3,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  'frame-rose': {
    borderColor: '#fb7185',
    borderWidth: 3,
    shadowColor: '#f43f5e',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  'frame-forest': {
    borderColor: '#22c55e',
    borderWidth: 3,
    shadowColor: '#15803d',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  'frame-fire': {
    borderColor: '#fb923c',
    borderWidth: 3,
    shadowColor: '#f97316',
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 3,
  },
  'frame-ocean': {
    borderColor: '#38bdf8',
    borderWidth: 3,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  'frame-neon': {
    borderColor: '#a855f7',
    borderWidth: 3,
    shadowColor: '#c084fc',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  'frame-minimal': {
    borderColor: '#e5e7eb',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  'frame-crown': {
    borderColor: '#facc15',
    borderWidth: 4,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const getFrameDecoration = (frameId: string | null): FrameDecoration | null => {
  if (!frameId) return null;
  return FRAME_STYLES[frameId] ?? null;
};
