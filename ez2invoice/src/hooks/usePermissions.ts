'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/contexts/ShopContext';

export type PermissionKey =
  | 'invoices.create' | 'invoices.edit' | 'invoices.delete' | 'invoices.view'
  | 'workorders.create' | 'workorders.edit' | 'workorders.delete' | 'workorders.view'
  | 'customers.manage' | 'inventory.manage' | 'vendors.manage' | 'reports.view'
  | 'settings.manage' | 'team.manage'
  | 'estimates.view' | 'estimates.create' | 'estimates.edit' | 'estimates.delete';

export interface UsePermissionsReturn {
  permissions: Record<string, boolean>;
  can: (key: PermissionKey | string) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { currentShopId } = useShop();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!currentShopId) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/permissions?shopId=${currentShopId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || {});
      } else {
        setPermissions({});
      }
    } catch {
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  }, [currentShopId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback((key: PermissionKey | string) => {
    return permissions[key] === true;
  }, [permissions]);

  return {
    permissions,
    can,
    isLoading,
    refresh: fetchPermissions,
  };
}
