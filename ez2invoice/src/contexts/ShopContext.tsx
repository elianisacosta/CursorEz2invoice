'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'ez2invoice-current-shop-id';

export interface Shop {
  id: string;
  shop_name: string;
  user_id?: string;
}

export interface ShopContextType {
  currentShopId: string | null;
  setCurrentShopId: (id: string | null) => void;
  shops: Shop[];
  isLoading: boolean;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [currentShopId, setCurrentShopIdState] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentShopId = useCallback((id: string | null) => {
    setCurrentShopIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const fetchShops = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      setShops([]);
      setCurrentShopIdState(null);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Shops user owns (truck_shops.user_id)
      const { data: ownedShops } = await supabase
        .from('truck_shops')
        .select('id, shop_name, user_id')
        .eq('user_id', user.id);

      // 2. Shops user is member of (shop_memberships) - may not exist before migration
      let memberShops: Shop[] = [];
      try {
        const { data: memberships } = await supabase
          .from('shop_memberships')
          .select('shop_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const memberShopIds = (memberships || []).map(m => m.shop_id).filter(Boolean);
        if (memberShopIds.length > 0) {
          const { data } = await supabase
            .from('truck_shops')
            .select('id, shop_name, user_id')
            .in('id', memberShopIds);
          memberShops = data || [];
        }
      } catch {
        // shop_memberships table may not exist before migration
      }

      // Merge: owned first, then member-only (dedupe by id)
      const seen = new Set<string>();
      const allShops: Shop[] = [];
      for (const s of ownedShops || []) {
        if (s.id && !seen.has(s.id)) {
          seen.add(s.id);
          allShops.push(s);
        }
      }
      for (const s of memberShops) {
        if (s.id && !seen.has(s.id)) {
          seen.add(s.id);
          allShops.push(s);
        }
      }

      setShops(allShops);

      // Restore or set current shop
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const validStored = stored && allShops.some(s => s.id === stored);
      if (validStored) {
        setCurrentShopIdState(stored);
      } else if (allShops.length > 0) {
        const first = allShops[0].id;
        setCurrentShopIdState(first);
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, first);
      } else {
        setCurrentShopIdState(null);
      }
    } catch (e) {
      console.error('Error fetching shops:', e);
      setShops([]);
      setCurrentShopIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth?.user) {
      fetchShops();
    } else {
      setShops([]);
      setCurrentShopIdState(null);
      setIsLoading(false);
    }
  }, [auth?.user?.id, fetchShops]);

  const value: ShopContextType = {
    currentShopId,
    setCurrentShopId,
    shops,
    isLoading,
    refreshShops: fetchShops,
  };

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (ctx === undefined) {
    throw new Error('useShop must be used within ShopProvider');
  }
  return ctx;
}
