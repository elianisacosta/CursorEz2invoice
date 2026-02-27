-- Multi-User / Team Members Schema
-- Run this in your Supabase SQL Editor
-- Enables shops to have multiple users with roles & permissions

-- ============================================
-- Step 1: Permissions reference table
-- ============================================
CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  description TEXT,
  category TEXT
);

INSERT INTO public.permissions (key, description, category) VALUES
  ('invoices.create', 'Create invoices', 'invoices'),
  ('invoices.edit', 'Edit invoices', 'invoices'),
  ('invoices.delete', 'Delete invoices', 'invoices'),
  ('invoices.view', 'View invoices', 'invoices'),
  ('workorders.create', 'Create work orders', 'workorders'),
  ('workorders.edit', 'Edit work orders', 'workorders'),
  ('workorders.delete', 'Delete work orders', 'workorders'),
  ('workorders.view', 'View work orders', 'workorders'),
  ('customers.manage', 'Manage customers', 'customers'),
  ('inventory.manage', 'Manage inventory', 'inventory'),
  ('vendors.manage', 'Manage vendors', 'vendors'),
  ('reports.view', 'View reports', 'reports'),
  ('settings.manage', 'Manage settings', 'settings'),
  ('team.manage', 'Manage team (invite/remove users)', 'team'),
  ('estimates.view', 'View estimates', 'estimates'),
  ('estimates.create', 'Create estimates', 'estimates'),
  ('estimates.edit', 'Edit estimates', 'estimates'),
  ('estimates.delete', 'Delete estimates', 'estimates')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Step 2: Roles table (system roles, shop_id NULL)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_system_slug ON public.roles(slug) WHERE shop_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_shop_slug ON public.roles(shop_id, slug) WHERE shop_id IS NOT NULL;

-- Create system roles if not exist
INSERT INTO public.roles (id, shop_id, name, slug, is_system) 
SELECT gen_random_uuid(), NULL, 'Owner', 'owner', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'owner' AND shop_id IS NULL);

INSERT INTO public.roles (id, shop_id, name, slug, is_system) 
SELECT gen_random_uuid(), NULL, 'Admin', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'admin' AND shop_id IS NULL);

INSERT INTO public.roles (id, shop_id, name, slug, is_system) 
SELECT gen_random_uuid(), NULL, 'Manager', 'manager', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'manager' AND shop_id IS NULL);

INSERT INTO public.roles (id, shop_id, name, slug, is_system) 
SELECT gen_random_uuid(), NULL, 'Technician', 'technician', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'technician' AND shop_id IS NULL);

INSERT INTO public.roles (id, shop_id, name, slug, is_system) 
SELECT gen_random_uuid(), NULL, 'Cashier', 'cashier', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE slug = 'cashier' AND shop_id IS NULL);

-- ============================================
-- Step 3: Role permissions (which permissions each role has)
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

-- Owner: all permissions
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'owner' AND r.shop_id IS NULL
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Admin: all except team.manage (owner-only for transfer)
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'admin' AND r.shop_id IS NULL AND p.key != 'team.manage'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Manager: most except settings, team
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'manager' AND r.shop_id IS NULL 
  AND p.key NOT IN ('settings.manage', 'team.manage')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Technician: work orders, customers, inventory view, estimates
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'technician' AND r.shop_id IS NULL 
  AND p.key IN ('workorders.create','workorders.edit','workorders.view','customers.manage','inventory.manage','estimates.view','estimates.create','estimates.edit')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Cashier: invoices, customers view, work orders view
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'cashier' AND r.shop_id IS NULL 
  AND p.key IN ('invoices.create','invoices.edit','invoices.view','customers.manage','workorders.view','estimates.view')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ============================================
-- Step 4: Shop memberships (user <-> shop with role)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shop_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'disabled')),
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_id)
);

-- Add FK to auth.users for user_id (Supabase uses auth.users)
ALTER TABLE public.shop_memberships 
  DROP CONSTRAINT IF EXISTS shop_memberships_user_id_fkey;
ALTER TABLE public.shop_memberships 
  ADD CONSTRAINT shop_memberships_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- Step 5: Shop invites (pending invites by email)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shop_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.truck_shops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID,
  token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, email)
);

-- ============================================
-- Step 6: RLS Helper - user has active access to shop
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_shop_access(p_user_id UUID, p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Legacy: shop owner (truck_shops.user_id)
  IF EXISTS (SELECT 1 FROM public.truck_shops ts WHERE ts.id = p_shop_id AND ts.user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;
  -- Active membership
  RETURN EXISTS (
    SELECT 1 FROM public.shop_memberships sm
    WHERE sm.user_id = p_user_id AND sm.shop_id = p_shop_id AND sm.status = 'active'
  );
END;
$$;

-- ============================================
-- Step 7: RLS Helper - user has permission in shop
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_shop_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Owner has all permissions
  IF EXISTS (SELECT 1 FROM public.truck_shops WHERE id = p_shop_id AND user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;
  -- Check membership + role permissions
  SELECT sm.role_id INTO v_role_id
  FROM public.shop_memberships sm
  WHERE sm.user_id = p_user_id AND sm.shop_id = p_shop_id AND sm.status = 'active';

  IF v_role_id IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = v_role_id AND rp.permission_key = p_permission
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_shop_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_shop_access(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, UUID, TEXT) TO anon;

-- ============================================
-- Step 8: Bootstrap owner memberships for existing shops
-- ============================================
INSERT INTO public.shop_memberships (user_id, shop_id, role_id, status, accepted_at)
SELECT ts.user_id, ts.id, r.id, 'active', NOW()
FROM public.truck_shops ts
CROSS JOIN public.roles r
WHERE r.slug = 'owner' AND r.shop_id IS NULL
  AND ts.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.shop_memberships sm WHERE sm.user_id = ts.user_id AND sm.shop_id = ts.id)
ON CONFLICT (user_id, shop_id) DO NOTHING;

-- ============================================
-- Step 9: Enable RLS on new tables
-- ============================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_invites ENABLE ROW LEVEL SECURITY;

-- Permissions: readable by authenticated
DROP POLICY IF EXISTS "permissions_select" ON public.permissions;
CREATE POLICY "permissions_select" ON public.permissions FOR SELECT TO authenticated USING (true);

-- Roles: readable by authenticated
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated USING (true);

-- Role permissions: readable by authenticated
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Shop memberships: users can see memberships for shops they have access to
DROP POLICY IF EXISTS "shop_memberships_select" ON public.shop_memberships;
CREATE POLICY "shop_memberships_select" ON public.shop_memberships FOR SELECT TO authenticated
  USING (user_has_shop_access(auth.uid(), shop_id));

DROP POLICY IF EXISTS "shop_memberships_insert" ON public.shop_memberships;
CREATE POLICY "shop_memberships_insert" ON public.shop_memberships FOR INSERT TO authenticated
  WITH CHECK (user_has_permission(auth.uid(), shop_id, 'team.manage'));

DROP POLICY IF EXISTS "shop_memberships_update" ON public.shop_memberships;
CREATE POLICY "shop_memberships_update" ON public.shop_memberships FOR UPDATE TO authenticated
  USING (user_has_permission(auth.uid(), shop_id, 'team.manage'));

DROP POLICY IF EXISTS "shop_memberships_delete" ON public.shop_memberships;
CREATE POLICY "shop_memberships_delete" ON public.shop_memberships FOR DELETE TO authenticated
  USING (user_has_permission(auth.uid(), shop_id, 'team.manage'));

-- Allow users to insert their own membership when accepting invite (via token)
-- We'll handle invite acceptance in API route with service role

-- Shop invites: team.manage can CRUD
DROP POLICY IF EXISTS "shop_invites_all" ON public.shop_invites;
CREATE POLICY "shop_invites_select" ON public.shop_invites FOR SELECT TO authenticated
  USING (user_has_shop_access(auth.uid(), shop_id));
CREATE POLICY "shop_invites_insert" ON public.shop_invites FOR INSERT TO authenticated
  WITH CHECK (user_has_permission(auth.uid(), shop_id, 'team.manage'));
CREATE POLICY "shop_invites_update" ON public.shop_invites FOR UPDATE TO authenticated
  USING (user_has_permission(auth.uid(), shop_id, 'team.manage'));
CREATE POLICY "shop_invites_delete" ON public.shop_invites FOR DELETE TO authenticated
  USING (user_has_permission(auth.uid(), shop_id, 'team.manage'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shop_memberships_user_id ON public.shop_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_memberships_shop_id ON public.shop_memberships(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_memberships_status ON public.shop_memberships(status);
CREATE INDEX IF NOT EXISTS idx_shop_invites_shop_id ON public.shop_invites(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invites_email ON public.shop_invites(email);
CREATE INDEX IF NOT EXISTS idx_shop_invites_token ON public.shop_invites(token);
