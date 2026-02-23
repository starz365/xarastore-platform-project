import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey } from '@/lib/utils/security';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Authentication check - admin only
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    if (!authHeader && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let isAuthenticated = false;
    let userId = '';
    
    if (apiKey) {
      isAuthenticated = await validateApiKey(apiKey, 'admin');
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
        const { data: userRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        isAuthenticated = userRole?.role === 'admin';
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { product_id, expire_all = false } = body;

    if (!product_id && !expire_all) {
      return NextResponse.json(
        { error: 'Either product_id or expire_all=true is required' },
        { status: 400 }
      );
    }

    let expiredCount = 0;
    const now = new Date().toISOString();

    if (expire_all) {
      // Expire all deals that have passed their end date
      const { data: expiredDeals, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('id, price, original_price')
        .eq('is_deal', true)
        .lt('deal_ends_at', now);

      if (fetchError) {
        console.error('Fetch expired deals error:', fetchError);
        throw fetchError;
      }

      // Update each expired deal
      for (const deal of expiredDeals || []) {
        const updateData = {
          is_deal: false,
          price: deal.original_price || deal.price,
          original_price: null,
          deal_ends_at: null,
          updated_at: now,
        };

        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update(updateData)
          .eq('id', deal.id);

        if (!updateError) {
          expiredCount++;
          
          // Update deal record
          await supabaseAdmin
            .from('deals')
            .update({
              ended_at: now,
              is_active: false,
              updated_at: now,
            })
            .eq('product_id', deal.id)
            .is('ended_at', null);
        }
      }
    } else {
      // Expire specific deal
      const { data: product, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('id, price, original_price, is_deal')
        .eq('id', product_id)
        .single();

      if (fetchError || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      if (!product.is_deal) {
        return NextResponse.json(
          { error: 'Product is not on deal' },
          { status: 400 }
        );
      }

      const updateData = {
        is_deal: false,
        price: product.original_price || product.price,
        original_price: null,
        deal_ends_at: null,
        updated_at: now,
      };

      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', product_id);

      if (updateError) {
        console.error('Deal expiration error:', updateError);
        throw updateError;
      }

      // Update deal record
      await supabaseAdmin
        .from('deals')
        .update({
          ended_at: now,
          is_active: false,
          updated_at: now,
        })
        .eq('product_id', product_id)
        .is('ended_at', null);

      expiredCount = 1;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: expire_all ? 'deals_expire_all' : 'deal_expire',
      table_name: 'products',
      record_id: product_id || 'all',
      user_id: userId || 'system',
      old_data: null,
      new_data: { expired_count: expiredCount },
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      message: expire_all 
        ? `${expiredCount} deals expired successfully`
        : 'Deal expired successfully',
      data: {
        expired_count: expiredCount,
        timestamp: now,
      },
    });

  } catch (error: any) {
    console.error('Deal expiration API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to expire deal(s)',
        code: 'DEAL_EXPIRE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
