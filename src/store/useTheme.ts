import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { themes, type Palette } from '@/styles/colors';

export type ThemeId = keyof typeof themes;

type ThemeState = {
  themeKey: ThemeId;
  palette: Palette;
  setTheme: (key: ThemeId) => Promise<void>;
  load: () => Promise<void>;
};

const STORAGE_KEY = 'app_theme';

export const useTheme = create<ThemeState>((set) => ({
  themeKey: 'ninja' as ThemeId,
  palette: themes.ninja,
  setTheme: async (key) => {
    await AsyncStorage.setItem(STORAGE_KEY, key);
    set({ themeKey: key, palette: themes[key] });
  },
  load: async () => {
    const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeId | null;
    const nextKey: ThemeId = stored && stored in themes ? stored : 'ninja';
    set({ themeKey: nextKey, palette: themes[nextKey] });
  },
}));
