const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Item {
  id: number;
  name: string;
  type: string;
  rarity?: string;
  stack_size?: number;
  recycle_yield?: string;
  category?: string;
}

export interface Material {
  name: string;
  quantity: number;
}

export interface UpgradeChainStep {
  item: string;
  type: 'craft' | 'upgrade';
  from: string | null;
  materials: Array<{
    name: string;
    quantity: number;
    type: string;
  }>;
}

export interface UpgradeChain {
  targetItem: string;
  chain: UpgradeChainStep[];
}

export interface SmartRecommendation {
  item: string;
  reason: string;
  recycleYield: Record<string, number>;
  spaceSaved: number;
  priority: 'high' | 'medium' | 'low';
}

export interface MaterialBreakdown {
  name: string;
  quantity: number;
  hasRecipe: boolean;
  breakdown: MaterialBreakdown[];
}

export interface ItemBreakdown {
  item: string;
  directRequirements: MaterialBreakdown[];
  error?: string;
}

export interface LoadoutCalculation {
  items: string[];
  materials: {
    direct: Material[];
    intermediate: Material[];
    raw: Material[];
    allItems: string[];
    upgradeChains?: UpgradeChain[];
  };
  optimization: {
    stashLimit: number;
    currentUsage: number;
    remainingSpace: number;
    prioritizedItems: Array<{
      name: string;
      type: string;
      rarity?: string;
      stackSize: number;
      recipeCount: number;
      priorityScore: number;
      shouldKeep: boolean;
      recycleYield?: Record<string, number>;
      materialDensity?: number;
      recycleEfficiency?: number;
    }>;
    recommendations: {
      keep: string[];
      recycle: string[];
      consider: string[];
      message: string;
    };
    efficiency: {
      itemsPerSlot: number;
      averageStackSize: number;
      highValueItems: number;
    };
    smartRecommendations?: SmartRecommendation[];
    recycleEfficiency?: Record<string, number>;
  };
}

export const api = {
  async getItems(search?: string, type?: string): Promise<Item[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    
    const url = `${API_BASE_URL}/items${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch items');
    }
    
    return response.json();
  },

  async getItem(name: string): Promise<Item> {
    const response = await fetch(`${API_BASE_URL}/items/${encodeURIComponent(name)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch item');
    }
    
    return response.json();
  },

  async calculateLoadout(items: string[]): Promise<LoadoutCalculation> {
    const response = await fetch(`${API_BASE_URL}/loadout/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to calculate loadout');
    }
    
    return response.json();
  },

  async calculateItemBreakdown(items: string[]): Promise<ItemBreakdown[]> {
    const response = await fetch(`${API_BASE_URL}/loadout/breakdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to calculate breakdown');
    }
    
    return response.json();
  },
};
