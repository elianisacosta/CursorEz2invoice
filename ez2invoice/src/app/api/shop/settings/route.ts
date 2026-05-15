import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSupabase } from '@/lib/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

const FULL_SELECT =
  'id, shop_name, address, city, state, zip_code, phone, email, tax_id, website, labor_rate, default_tax_rate, card_processing_fee_percentage, invoice_terms, updated_at';

const BASIC_SELECT = 'id, shop_name, address, city, state, zip_code, phone, updated_at';

async function userCanAccessShop(
  db: SupabaseClient,
  userId: string,
  shopId: string
): Promise<boolean> {
  const { data: shop } = await db
    .from('truck_shops')
    .select('id, user_id')
    .eq('id', shopId)
    .maybeSingle();

  if (!shop) return false;
  if (shop.user_id === userId) return true;

  try {
    const { data: membership } = await db
      .from('shop_memberships')
      .select('id')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    return !!membership;
  } catch {
    return false;
  }
}

function getAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  return authHeader?.replace(/^Bearer\s+/i, '') || null;
}

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) return false;
  return (
    error.code === '42703' ||
    error.message.includes('column') ||
    error.message.includes('does not exist')
  );
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = req.nextUrl.searchParams.get('shopId');
    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    const { user, supabase, admin, error: authError } =
      await getAuthenticatedSupabase(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = admin ?? supabase;
    const allowed = await userCanAccessShop(db, user.id, shopId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let { data, error } = await db.from('truck_shops').select(FULL_SELECT).eq('id', shopId).single();
    let shop: Record<string, unknown> | null = data;

    if (error && isMissingColumnError(error)) {
      const fallback = await db.from('truck_shops').select(BASIC_SELECT).eq('id', shopId).single();
      shop = fallback.data;
      error = fallback.error;
    }

    if (error || !shop) {
      console.error('[ShopSettings GET]', error);
      return NextResponse.json({ error: 'Failed to load shop settings' }, { status: 500 });
    }

    return NextResponse.json({ shop });
  } catch (err) {
    console.error('[ShopSettings GET]', err);
    return NextResponse.json({ error: 'Failed to load shop settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const shopId = body.shopId as string | undefined;
    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    const { user, supabase, admin, error: authError } =
      await getAuthenticatedSupabase(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = admin ?? supabase;
    if (!admin) {
      console.warn('[ShopSettings PUT] SUPABASE_SERVICE_ROLE_KEY not set; using user client (RLS applies)');
    }

    const allowed = await userCanAccessShop(db, user.id, shopId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const laborRateRaw = body.labor_rate;
    const laborRate =
      laborRateRaw === '' || laborRateRaw == null
        ? null
        : Number(laborRateRaw);

    const extendedPayload: Record<string, unknown> = {
      shop_name: body.shop_name ?? '',
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip_code: body.zip_code || null,
      phone: body.phone || null,
      email: body.email || null,
      tax_id: body.tax_id || null,
      website: body.website || null,
      labor_rate: laborRate != null && !Number.isNaN(laborRate) ? laborRate : null,
      default_tax_rate: body.default_tax_rate ?? null,
      card_processing_fee_percentage: body.card_processing_fee_percentage ?? null,
      invoice_terms: body.invoice_terms ?? null,
      updated_at: new Date().toISOString(),
    };

    let result = await db
      .from('truck_shops')
      .update(extendedPayload)
      .eq('id', shopId)
      .select(FULL_SELECT)
      .single();

    let shop: Record<string, unknown> | null = result.data;
    let error = result.error;

    if (error && isMissingColumnError(error)) {
      const basicPayload = {
        shop_name: extendedPayload.shop_name,
        address: extendedPayload.address,
        city: extendedPayload.city,
        state: extendedPayload.state,
        zip_code: extendedPayload.zip_code,
        phone: extendedPayload.phone,
        updated_at: extendedPayload.updated_at,
      };
      const fallback = await db
        .from('truck_shops')
        .update(basicPayload)
        .eq('id', shopId)
        .select(BASIC_SELECT)
        .single();
      shop = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('[ShopSettings PUT]', error);
      return NextResponse.json(
        { error: error.message || 'Update failed' },
        { status: 500 }
      );
    }

    if (!shop) {
      console.error('[ShopSettings PUT] No rows updated for shop', shopId);
      return NextResponse.json(
        { error: 'No shop record was updated. Check RLS policies.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ shop });
  } catch (err) {
    console.error('[ShopSettings PUT]', err);
    return NextResponse.json({ error: 'Failed to save shop settings' }, { status: 500 });
  }
}
