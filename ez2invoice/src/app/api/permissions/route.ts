import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!shopId) {
      return NextResponse.json({ error: 'shopId required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionKeys = [
      'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.view',
      'workorders.create', 'workorders.edit', 'workorders.delete', 'workorders.view',
      'customers.manage', 'inventory.manage', 'vendors.manage', 'reports.view',
      'settings.manage', 'team.manage',
      'estimates.view', 'estimates.create', 'estimates.edit', 'estimates.delete',
    ];

    const permissions: Record<string, boolean> = {};
    for (const key of permissionKeys) {
      const { data } = await supabase.rpc('user_has_permission', {
        p_user_id: user.id,
        p_shop_id: shopId,
        p_permission: key,
      });
      permissions[key] = data === true;
    }

    return NextResponse.json({ permissions });
  } catch (error: any) {
    console.error('Permissions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', details: error?.message },
      { status: 500 }
    );
  }
}
