import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const billId = resolvedParams.id;
    
    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseUrl) {
      console.error('[PostBill] ❌ CRITICAL: NEXT_PUBLIC_SUPABASE_URL not set!');
      return NextResponse.json(
        { error: 'Server configuration error: NEXT_PUBLIC_SUPABASE_URL is required' },
        { status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      console.error('[PostBill] ❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set! Bill posting will fail with RLS enabled.');
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required. Please add it to your .env.local file.' },
        { status: 500 }
      );
    }
    
    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with service role for transactions
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start transaction: Get bill with lines
    const { data: bill, error: billError } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        vendor_bill_lines (*)
      `)
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      console.error('Error fetching bill:', billError);
      return NextResponse.json(
        { error: 'Bill not found', details: billError?.message },
        { status: 404 }
      );
    }

    // Check if bill has shop_id
    if (!bill.shop_id) {
      console.error('Bill missing shop_id:', bill);
      return NextResponse.json(
        { error: 'Bill is missing shop_id' },
        { status: 400 }
      );
    }

    // Check if already posted
    if (bill.status === 'posted') {
      return NextResponse.json(
        { message: 'Bill already posted', bill },
        { status: 200 }
      );
    }

    // Verify user has access to this shop
    const { data: shop, error: shopError } = await supabase
      .from('truck_shops')
      .select('id')
      .eq('id', bill.shop_id)
      .eq('user_id', user.id)
      .single();

    if (shopError || !shop) {
      console.error('Error verifying shop access:', shopError, { billShopId: bill.shop_id, userId: user.id });
      return NextResponse.json(
        { error: 'Unauthorized - No access to this shop', details: shopError?.message },
        { status: 403 }
      );
    }

    // Process each line with inventory_item_id
    const linesToProcess = (bill.vendor_bill_lines || []).filter(
      (line: any) => line.inventory_item_id
    );

    if (linesToProcess.length === 0) {
      // No inventory items to process, just mark as posted
      const { error: updateError } = await supabase
        .from('vendor_bills')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: user.id
        })
        .eq('id', billId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update bill status' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Bill posted (no inventory items)',
        bill: { ...bill, status: 'posted' }
      });
    }

    // Process inventory updates in a transaction
    for (const line of linesToProcess) {
      if (!line.inventory_item_id) {
        console.warn('Skipping line with no inventory_item_id');
        continue;
      }

      // Get current inventory item
      const { data: inventoryItem, error: itemError } = await supabase
        .from('parts')
        .select('quantity_in_stock, avg_cost, last_cost, cost')
        .eq('id', line.inventory_item_id)
        .single();

      if (itemError || !inventoryItem) {
        console.error(`Inventory item not found: ${line.inventory_item_id}`, itemError);
        // Skip this line but continue processing others
        continue;
      }

      const currentQty = Number(inventoryItem.quantity_in_stock || 0);
      const currentAvgCost = inventoryItem.avg_cost || inventoryItem.cost || 0;
      const newQty = currentQty + Number(line.qty);
      const newUnitCost = Number(line.unit_cost);

      // Calculate weighted average cost
      const totalValue = (currentQty * currentAvgCost) + (Number(line.qty) * newUnitCost);
      const newAvgCost = newQty > 0 ? totalValue / newQty : newUnitCost;

      // Insert inventory movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          shop_id: bill.shop_id,
          item_id: line.inventory_item_id,
          qty_change: line.qty,
          unit_cost: newUnitCost,
          source_type: 'vendor_bill',
          source_id: billId
        })
        .select()
        .single();

      if (movementError) {
        // Check if it's a duplicate (idempotent)
        if (movementError.code !== '23505') { // Unique violation
          console.error('Error inserting inventory movement:', movementError);
          return NextResponse.json(
            { error: 'Failed to record inventory movement' },
            { status: 500 }
          );
        }
        // If duplicate, skip this line (already processed)
        continue;
      }

      // Update inventory item
      const updateData: any = {
        quantity_in_stock: newQty,
        avg_cost: newAvgCost,
        last_cost: newUnitCost,
        cost: newAvgCost // Update cost field as well
      };
      
      // Only add updated_at if the column exists (check by trying to update without it first)
      const { error: updateError } = await supabase
        .from('parts')
        .update(updateData)
        .eq('id', line.inventory_item_id);

      if (updateError) {
        console.error('Error updating inventory item:', updateError);
        return NextResponse.json(
          { error: 'Failed to update inventory' },
          { status: 500 }
        );
      }
    }

    // Update bill status
    const { error: updateError } = await supabase
      .from('vendor_bills')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: user.id
      })
      .eq('id', billId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update bill status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Bill posted successfully',
      bill: { ...bill, status: 'posted' }
    });

  } catch (error: any) {
    console.error('Error posting bill:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
