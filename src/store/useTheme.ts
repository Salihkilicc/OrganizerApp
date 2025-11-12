import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { themes, type Palette } from '@/styles/colors';

export type ThemeKey = keyof typeof themes;

type ThemeState = {
  themeKey: ThemeKey;
  palette: Palette;
  setTheme: (key: ThemeKey) => Promise<void>;
  load: () => Promise<void>;
};

const STORAGE_KEY = 'app_theme';

export const useTheme = create<ThemeState>((set) => ({
  themeKey: 'ninja',
  palette: themes.ninja,
  setTheme: async (key) => {
    await AsyncStorage.setItem(STORAGE_KEY, key);
    set({ themeKey: key, palette: themes[key] });
  },
  load: async () => {
    const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeKey | null;
    const nextKey: ThemeKey = stored && stored in themes ? stored : 'ninja';
    set({ themeKey: nextKey, palette: themes[nextKey] });
  },
}));
