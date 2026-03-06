import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken || undefined);
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Please sign in to accept this invite' }, { status: 401 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('shop_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found or has expired' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin.from('shop_invites').update({ status: 'expired' }).eq('id', invite.id);
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    // Ensure the logged-in user is the one the invite was sent to (prevent wrong person accepting)
    const inviteEmail = (invite.email || '').toString().toLowerCase().trim();
    const userEmail = (user.email || '').toLowerCase().trim();
    if (inviteEmail && userEmail && inviteEmail !== userEmail) {
      return NextResponse.json(
        {
          error: 'wrong_user',
          inviteEmail,
          userEmail,
          message: `This invite was sent to ${invite.email}. You're logged in as ${user.email}. Please sign out and open this link again to accept the invite.`,
        },
        { status: 403 }
      );
    }

    const { error: membershipError } = await supabaseAdmin
      .from('shop_memberships')
      .upsert({
        user_id: user.id,
        shop_id: invite.shop_id,
        role_id: invite.role_id,
        status: 'active',
        accepted_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,shop_id',
      });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    await supabaseAdmin.from('shop_invites').update({ status: 'accepted' }).eq('id', invite.id);

    return NextResponse.json({ success: true, shopId: invite.shop_id });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
