import { Platform } from 'react-native';

const FAVORITES_KEY = 'lootPlanner_favorites';
const LOADOUTS_KEY = 'lootPlanner_loadouts';
const STASH_PREFERENCES_KEY = 'stashOptimizer_preferences';

export interface SavedLoadout {
  id: string;
  name: string;
  createdAt: number;
  data: {
    augmentId: string;
    shieldId: string | null;
    weapon1Id: string | null;
    weapon2Id: string | null;
    weapon1Level: number;
    weapon2Level: number;
    equippedAttachments: Record<string, string>;
    backpackSlots: Array<{ id: string | null; qty: number }>;
    quickUseSlots: Array<{ id: string | null; qty: number }>;
  };
}

/**
 * Cross-platform storage for favorites.
 * Uses localStorage for web, can be extended with AsyncStorage for native.
 */
export const storage = {
  async getFavorites(): Promise<string[]> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
      // For native, we could use AsyncStorage here if needed
      // For now, return empty array if not web
      return [];
    } catch (e) {
      console.error('Error loading favorites:', e);
      return [];
    }
  },

  async saveFavorites(items: string[]): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
      }
      // For native, we could use AsyncStorage here if needed
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  },

  async getLoadouts(): Promise<SavedLoadout[]> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(LOADOUTS_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return [];
    } catch (e) {
      console.error('Error loading loadouts:', e);
      return [];
    }
  },

  async saveLoadouts(loadouts: SavedLoadout[]): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOADOUTS_KEY, JSON.stringify(loadouts));
      }
    } catch (e) {
      console.error('Error saving loadouts:', e);
    }
  },

  async getStashPreferences(): Promise<{ targetItems: string[]; targetQuantities?: Record<string, number>; targetLevels?: Record<string, number>; stashLimit: number }> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STASH_PREFERENCES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Migrate old format to new format if needed
          if (parsed.selectedMaterials || parsed.craftPreferences) {
            // Old format: extract target items from craftPreferences
            const targetItems = new Set<string>();
            if (parsed.craftPreferences) {
              Object.values(parsed.craftPreferences).forEach((items: string[]) => {
                items.forEach(item => targetItems.add(item));
              });
            }
            return { targetItems: Array.from(targetItems), targetQuantities: {}, targetLevels: {}, stashLimit: parsed.stashLimit || 280 };
          }
          return { targetQuantities: {}, targetLevels: {}, stashLimit: 280, ...parsed };
        }
      }
      return { targetItems: [], targetQuantities: {}, targetLevels: {}, stashLimit: 280 };
    } catch (e) {
      console.error('Error loading stash preferences:', e);
      return { targetItems: [], targetQuantities: {}, targetLevels: {}, stashLimit: 280 };
    }
  },

  async saveStashPreferences(preferences: { targetItems: string[]; targetQuantities?: Record<string, number>; targetLevels?: Record<string, number>; stashLimit: number }): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STASH_PREFERENCES_KEY, JSON.stringify(preferences));
      }
    } catch (e) {
      console.error('Error saving stash preferences:', e);
    }
  },
};
