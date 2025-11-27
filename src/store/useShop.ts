import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { usePoints } from '@/store/usePoints';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { useStreak } from '@/store/useStreak';
import { useTheme, type ThemeId } from '@/store/useTheme';
import { notifyBadgeUnlocked } from '@/lib/notifications';

export type ShopItemCategory = 'theme' | 'badge' | 'frame';
export type ShopUnlockType = 'points' | 'achievement';

type ShopItemDefinition = {
  id: string;
  category: ShopItemCategory;
  title: string;
  subtitle?: string;
  cost?: number;
  unlockType: ShopUnlockType;
  requirementDescription?: string;
};

export type ShopItem = ShopItemDefinition & {
  owned: boolean;
  equipped?: boolean;
};

type ShopStoragePayload = {
  ownedIds: string[];
  equipped: Record<ShopItemCategory, string | null>;
  notifiedAchievements: string[];
};

type AchievementContext = {
  streakDays: number;
  completedPlans: number;
  focusSessions: number;
  maxTotalPoints: number;
};

type ShopState = {
  items: ShopItem[];
  ownedIds: string[];
  equipped: Record<ShopItemCategory, string | null>;
  notifiedAchievements: string[];
  buyWithPoints: (id: string) => void;
  equipItem: (id: string) => void;
  hydrate: () => Promise<void>;
};

const SHOP_STORAGE_KEY = 'shop:v1';

const DEFAULT_OWNED_IDS: string[] = ['theme-classic', 'theme-ninja'];

const DEFAULT_EQUIPPED: Record<ShopItemCategory, string | null> = {
  badge: null,
  frame: null,
  theme: 'theme-ninja',
};

const DEFAULT_NOTIFIED_ACHIEVEMENTS: string[] = [];

const THEME_ITEM_TO_KEY: Record<string, ThemeId> = {
  'theme-classic': 'classic',
  'theme-midnight': 'midnight',
  'theme-forest': 'forest',
  'theme-sunset': 'sunset',
  'theme-ocean': 'ocean',
  'theme-sakura': 'sakura',
  'theme-neon': 'neon',
  'theme-coffee': 'coffee',
  'theme-minimal': 'minimal',
  'theme-ninja': 'ninja',
};

const THEME_ITEMS: ShopItemDefinition[] = [
  {
    id: 'theme-classic',
    category: 'theme',
    title: 'Classic Light',
    subtitle: 'Clean and simple daylight mode',
    cost: 0,
    unlockType: 'points',
  },
  {
    id: 'theme-midnight',
    category: 'theme',
    title: 'Midnight Focus',
    subtitle: 'Deep dark palette for late-night work',
    cost: 300,
    unlockType: 'points',
  },
  {
    id: 'theme-forest',
    category: 'theme',
    title: 'Forest Zen',
    subtitle: 'Green, calm, nature-inspired focus',
    cost: 400,
    unlockType: 'points',
  },
  {
    id: 'theme-sunset',
    category: 'theme',
    title: 'Sunset Glow',
    subtitle: 'Warm oranges and pinks',
    cost: 450,
    unlockType: 'points',
  },
  {
    id: 'theme-ocean',
    category: 'theme',
    title: 'Ocean Blue',
    subtitle: 'Cool blues for a clear mind',
    cost: 450,
    unlockType: 'points',
  },
  {
    id: 'theme-sakura',
    category: 'theme',
    title: 'Sakura Breeze',
    subtitle: 'Soft pastel pinks',
    cost: 500,
    unlockType: 'points',
  },
  {
    id: 'theme-neon',
    category: 'theme',
    title: 'Neon Grid',
    subtitle: 'High contrast, neon-style focus',
    cost: 550,
    unlockType: 'points',
  },
  {
    id: 'theme-coffee',
    category: 'theme',
    title: 'Coffee Shop',
    subtitle: 'Warm browns for cozy sessions',
    cost: 350,
    unlockType: 'points',
  },
  {
    id: 'theme-minimal',
    category: 'theme',
    title: 'Minimal Grey',
    subtitle: 'Neutral greys, minimal distractions',
    cost: 250,
    unlockType: 'points',
  },
  {
    id: 'theme-ninja',
    category: 'theme',
    title: 'Ninja Dark',
    subtitle: 'Stealth black theme for pros',
    cost: 600,
    unlockType: 'points',
  },
];

const BADGE_ITEMS: ShopItemDefinition[] = [
  {
    id: 'badge-early-bird',
    category: 'badge',
    title: 'Early Bird',
    unlockType: 'achievement',
    requirementDescription: 'Complete a plan before 08:00 on 3 different days',
  },
  {
    id: 'badge-night-owl',
    category: 'badge',
    title: 'Night Owl',
    unlockType: 'achievement',
    requirementDescription: 'Complete a plan after 23:00 on 3 different days',
  },
  {
    id: 'badge-streak-7',
    category: 'badge',
    title: 'Streak Starter',
    unlockType: 'achievement',
    requirementDescription: 'Maintain a 7-day streak',
  },
  {
    id: 'badge-streak-30',
    category: 'badge',
    title: 'Streak Master',
    unlockType: 'achievement',
    requirementDescription: 'Maintain a 30-day streak',
  },
  {
    id: 'badge-focus-10',
    category: 'badge',
    title: 'Focus Rookie',
    unlockType: 'achievement',
    requirementDescription: 'Complete 10 focus-mode sessions',
  },
  {
    id: 'badge-focus-50',
    category: 'badge',
    title: 'Focus Veteran',
    unlockType: 'achievement',
    requirementDescription: 'Complete 50 focus-mode sessions',
  },
  {
    id: 'badge-plans-50',
    category: 'badge',
    title: 'Planner',
    unlockType: 'achievement',
    requirementDescription: 'Complete 50 plans',
  },
  {
    id: 'badge-plans-200',
    category: 'badge',
    title: 'Planner Pro',
    unlockType: 'achievement',
    requirementDescription: 'Complete 200 plans',
  },
  {
    id: 'badge-points-1000',
    category: 'badge',
    title: 'Point Collector',
    unlockType: 'achievement',
    requirementDescription: 'Reach 1,000 total points',
  },
  {
    id: 'badge-points-5000',
    category: 'badge',
    title: 'Point Hoarder',
    unlockType: 'achievement',
    requirementDescription: 'Reach 5,000 total points',
  },
];

const FRAME_ITEMS: ShopItemDefinition[] = [
  {
    id: 'frame-simple',
    category: 'frame',
    title: 'Simple Border',
    subtitle: 'Clean rounded border',
    cost: 100,
    unlockType: 'points',
  },
  {
    id: 'frame-silver',
    category: 'frame',
    title: 'Silver Frame',
    subtitle: 'Shiny silver outline',
    cost: 250,
    unlockType: 'points',
  },
  {
    id: 'frame-gold',
    category: 'frame',
    title: 'Gold Frame',
    subtitle: 'Premium gold outline',
    cost: 400,
    unlockType: 'points',
  },
  {
    id: 'frame-rose',
    category: 'frame',
    title: 'Rose Gold Frame',
    subtitle: 'Soft pink metallic border',
    cost: 450,
    unlockType: 'points',
  },
  {
    id: 'frame-forest',
    category: 'frame',
    title: 'Forest Frame',
    subtitle: 'Green accent border',
    cost: 300,
    unlockType: 'points',
  },
  {
    id: 'frame-fire',
    category: 'frame',
    title: 'Flame Frame',
    subtitle: 'Red/orange energetic border',
    cost: 500,
    unlockType: 'points',
  },
  {
    id: 'frame-ocean',
    category: 'frame',
    title: 'Ocean Frame',
    subtitle: 'Blue gradient frame',
    cost: 350,
    unlockType: 'points',
  },
  {
    id: 'frame-neon',
    category: 'frame',
    title: 'Neon Frame',
    subtitle: 'Glowing neon edges',
    cost: 550,
    unlockType: 'points',
  },
  {
    id: 'frame-minimal',
    category: 'frame',
    title: 'Minimal Line',
    subtitle: 'Very subtle thin border',
    cost: 150,
    unlockType: 'points',
  },
  {
    id: 'frame-crown',
    category: 'frame',
    title: 'Crown Frame',
    subtitle: 'Regal frame for top performers',
    cost: 700,
    unlockType: 'points',
  },
];

const SHOP_ITEMS: ShopItemDefinition[] = [...THEME_ITEMS, ...BADGE_ITEMS, ...FRAME_ITEMS];

const ACHIEVEMENT_UNLOCKERS: Record<string, (ctx: AchievementContext) => boolean> = {
  'badge-streak-7': (ctx) => ctx.streakDays >= 7,
  'badge-streak-30': (ctx) => ctx.streakDays >= 30,
  'badge-focus-10': (ctx) => ctx.focusSessions >= 10,
  'badge-focus-50': (ctx) => ctx.focusSessions >= 50,
  'badge-plans-50': (ctx) => ctx.completedPlans >= 50,
  'badge-plans-200': (ctx) => ctx.completedPlans >= 200,
  'badge-points-1000': (ctx) => ctx.maxTotalPoints >= 1000,
  'badge-points-5000': (ctx) => ctx.maxTotalPoints >= 5000,
};

const buildAchievementContext = (): AchievementContext => {
  const streakDays = useStreak.getState().streakDays;
  const pointsState = usePoints.getState();
  return {
    streakDays,
    focusSessions: pointsState.focusSessions,
    completedPlans: pointsState.completedPlans,
    maxTotalPoints: pointsState.maxTotal,
  };
};

const buildItemsList = (
  ownedIds: string[],
  equipped: Record<ShopItemCategory, string | null>,
  context: AchievementContext,
): ShopItem[] => {
  return SHOP_ITEMS.map((item) => {
    const isOwned =
      item.unlockType === 'points'
        ? item.cost === 0 || ownedIds.includes(item.id)
        : ACHIEVEMENT_UNLOCKERS[item.id]?.(context) ?? false;
    const isEquipped = Boolean(equipped[item.category] === item.id && isOwned);
    return {
      ...item,
      owned: isOwned,
      equipped: isEquipped,
    };
  });
};

const persistShopState = async (getState: () => ShopState) => {
  try {
    const { ownedIds, equipped, notifiedAchievements } = getState();
    const payload: ShopStoragePayload = {
      ownedIds,
      equipped,
      notifiedAchievements,
    };
    await AsyncStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[useShop/persist]', error);
  }
};

export const useShop = create<ShopState>((set, get) => {
  const rebuildItems = () => {
    const { ownedIds, equipped, notifiedAchievements } = get();
    const nextItems = buildItemsList(ownedIds, equipped, buildAchievementContext());

    const newlyUnlocked = nextItems.filter(
      (item) =>
        item.unlockType === 'achievement' &&
        item.owned &&
        !notifiedAchievements.includes(item.id),
    );
    if (newlyUnlocked.length) {
      set({
        notifiedAchievements: [
          ...new Set([...notifiedAchievements, ...newlyUnlocked.map((item) => item.id)]),
        ],
      });
      newlyUnlocked.forEach((item) => {
        void notifyBadgeUnlocked(item.title);
      });
      void persistShopState(get);
    }

    set({ items: nextItems });
  };

  const loadStoredState = async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ShopStoragePayload> | null;
      if (!parsed || typeof parsed !== 'object') return;
      const storedOwned =
        Array.isArray(parsed.ownedIds) && parsed.ownedIds.every((id) => typeof id === 'string')
          ? parsed.ownedIds
          : DEFAULT_OWNED_IDS;
      const storedEquipped: Record<ShopItemCategory, string | null> = {
        ...DEFAULT_EQUIPPED,
        ...((parsed.equipped ?? {}) as Record<ShopItemCategory, string | null>),
      };
      const storedNotified =
        Array.isArray((parsed as ShopStoragePayload).notifiedAchievements) &&
        (parsed as ShopStoragePayload).notifiedAchievements.every((id) => typeof id === 'string')
          ? (parsed as ShopStoragePayload).notifiedAchievements
          : DEFAULT_NOTIFIED_ACHIEVEMENTS;
      set({
        ownedIds: storedOwned,
        equipped: storedEquipped,
        notifiedAchievements: storedNotified,
        items: buildItemsList(storedOwned, storedEquipped, buildAchievementContext()),
      });
    } catch (error) {
      console.warn('[useShop/load]', error);
    }
  };

  const hydrate = async () => {
    await loadStoredState();
    rebuildItems();
  };

  const buyWithPoints = (id: string) => {
    const item = get().items.find((entry) => entry.id === id);
    if (!item || item.unlockType !== 'points' || item.owned) {
      return;
    }

    const cost = item.cost ?? 0;
    const success = usePoints.getState().spendPoints(cost);
    if (!success) {
      return;
    }

    set((state) => ({
      ownedIds: [...state.ownedIds, id],
    }));
    rebuildItems();
    void persistShopState(get);

    const currentlyEquipped = get().equipped[item.category];
    if ((item.category === 'theme' || item.category === 'frame') && !currentlyEquipped) {
      equipItem(id);
    }
  };

  const equipItem = (id: string) => {
    const item = get().items.find((entry) => entry.id === id);
    if (!item || !item.owned) {
      return;
    }
    if (item.category === 'badge') {
      return;
    }

    set((state) => ({
      equipped: {
        ...state.equipped,
        [item.category]: id,
      },
    }));
    if (item.category === 'theme') {
      const targetTheme = THEME_ITEM_TO_KEY[item.id];
      if (targetTheme) {
        void useTheme.getState().setTheme(targetTheme);
      }
    }
    if (item.category === 'frame') {
      void useProfileAppearance.getState().setFrame(item.id);
    }
    rebuildItems();
    void persistShopState(get);
  };

  useStreak.subscribe((state) => state.streakDays, rebuildItems);
  usePoints.subscribe((state) => state.maxTotal, rebuildItems);
  usePoints.subscribe((state) => state.focusSessions, rebuildItems);
  usePoints.subscribe((state) => state.completedPlans, rebuildItems);

  void loadStoredState();

  return {
    items: buildItemsList(DEFAULT_OWNED_IDS, DEFAULT_EQUIPPED, buildAchievementContext()),
    ownedIds: DEFAULT_OWNED_IDS,
    equipped: DEFAULT_EQUIPPED,
    notifiedAchievements: DEFAULT_NOTIFIED_ACHIEVEMENTS,
    buyWithPoints,
    equipItem,
    hydrate,
  };
});
