# Multi-User / Team Members Setup

This guide explains how to enable multi-user access for your EZ2Invoice shop.

## Overview

- **Shops** can have multiple users (team members) with different roles
- **Roles**: Owner, Admin, Manager, Technician, Cashier
- **Invite flow**: Shop owner/admin invites by email → user signs in → accepts invite
- **Plan limits**: Starter 1 user, Pro 2 users, Enterprise 5 users

## Step 1: Run SQL Migrations

Run these in your **Supabase SQL Editor** in order:

### 1. Schema (tables, roles, permissions, memberships)

```bash
# File: ez2invoice/multi-user-team-members-schema.sql
```

Run the entire contents of `multi-user-team-members-schema.sql`.

### 2. RLS Policies (update existing tables)

```bash
# File: ez2invoice/multi-user-rls-policies.sql
```

Run the entire contents of `multi-user-rls-policies.sql`.

## Step 2: Verify

1. Log in to your dashboard
2. Go to **User Permissions** (sidebar)
3. You should see yourself as Owner
4. Click **Invite User** to invite a team member

## Invite Flow

1. Owner/Admin goes to User Permissions → Invite User
2. Enters email and selects role (Admin, Manager, Technician, Cashier)
3. Invite is created; an email is sent (if Resend is configured)
4. Invite link is also copied to clipboard
5. Invited user clicks link → signs in (or signs up) → membership is activated
6. User can now access the shop from their account

## Shop Selector

If a user belongs to multiple shops, a **Current Shop** dropdown appears in the User Permissions tab. They can switch between shops.

## Plan Limits

Before inviting, ensure you don't exceed your plan:

- **Starter**: 1 user (owner only)
- **Pro**: 2 users
- **Enterprise**: 5 users

## Step 3: Environment Variable (for invite acceptance)

Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` and Vercel. This is required for the invite acceptance API (bypasses RLS to create memberships).

Get it from: Supabase Dashboard → Settings → API → `service_role` key (keep secret!)

## Troubleshooting

### "shop_memberships does not exist"
Run `multi-user-team-members-schema.sql` first.

### "user_has_shop_access does not exist"
The schema migration creates this function. Run it fully.

### Invite email not sending
Configure `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local` and Vercel. See `EMAIL_SETUP.md`.

### Team member sees no data
Ensure they've accepted the invite and have `status: active` in `shop_memberships`.
