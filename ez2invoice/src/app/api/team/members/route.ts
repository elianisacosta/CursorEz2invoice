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

    const { data: memberships, error } = await supabase
      .from('shop_memberships')
      .select(`
        id,
        user_id,
        role_id,
        status,
        invited_at,
        accepted_at,
        role:roles(id, name, slug)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get owner from truck_shops
    const { data: shop } = await supabase
      .from('truck_shops')
      .select('user_id')
      .eq('id', shopId)
      .single();

    const ownerId = shop?.user_id;

    // Get emails from public.users (id matches auth.users)
    const userIds = [...new Set([...(memberships || []).map((m: any) => m.user_id), ownerId].filter(Boolean))];
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    const members = (memberships || []).map((m: any) => {
      const u = userMap.get(m.user_id);
      return {
        ...m,
        email: u?.email || null,
        first_name: u?.first_name || null,
        last_name: u?.last_name || null,
        isOwner: m.user_id === ownerId,
      };
    });

    // Add owner to list if not already in memberships
    if (ownerId && !memberships?.some((m: any) => m.user_id === ownerId)) {
      const ownerUser = userMap.get(ownerId);
      const { data: ownerRole } = await supabase.from('roles').select('id, name, slug').eq('slug', 'owner').is('shop_id', null).limit(1).maybeSingle();
      members.unshift({
        id: null,
        user_id: ownerId,
        role_id: ownerRole?.id,
        role: ownerRole,
        status: 'active',
        invited_at: null,
        accepted_at: null,
        email: ownerUser?.email || null,
        first_name: ownerUser?.first_name || null,
        last_name: ownerUser?.last_name || null,
        isOwner: true,
      });
    }

    return NextResponse.json({ members, ownerId });
  } catch (error: any) {
    console.error('Team members API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error?.message },
      { status: 500 }
    );
  }
}
