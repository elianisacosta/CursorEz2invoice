import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, email, roleSlug } = body;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!shopId || !email) {
      return NextResponse.json({ error: 'shopId and email required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token || undefined);
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get role id
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('slug', roleSlug || 'technician')
      .is('shop_id', null)
      .limit(1)
      .maybeSingle();

    const roleId = role?.id || null;

    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error } = await supabase
      .from('shop_invites')
      .insert({
        shop_id: shopId,
        email: email.toLowerCase().trim(),
        role_id: roleId,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User already invited to this shop' }, { status: 400 });
      }
      throw error;
    }

    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/accept?token=${inviteToken}`;
    const shopName = (await supabase.from('truck_shops').select('shop_name').eq('id', shopId).single()).data?.shop_name || 'the shop';

    // Send invite email (optional - may fail if Resend not configured)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: (body.email as string).toLowerCase().trim(),
          subject: `You're invited to join ${shopName} on EZ2Invoice`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">You're Invited!</h2>
              <p>You've been invited to join <strong>${shopName}</strong> on EZ2Invoice.</p>
              <p>Click the button below to accept the invite and get started:</p>
              <p style="margin: 24px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invite</a>
              </p>
              <p style="color: #6b7280; font-size: 12px;">Or copy and paste this link: ${acceptUrl}</p>
              <p style="color: #6b7280; font-size: 12px;">This invite expires in 7 days.</p>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.warn('Invite email send failed (Resend may not be configured):', emailErr);
    }

    return NextResponse.json({
      success: true,
      invite: { ...invite, acceptUrl },
    });
  } catch (error: any) {
    console.error('Invite API error:', error);
    return NextResponse.json(
      { error: 'Failed to create invite', details: error?.message },
      { status: 500 }
    );
  }
}
