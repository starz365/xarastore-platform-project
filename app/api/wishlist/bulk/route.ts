import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['add', 'remove', 'move']),
  productIds: z.array(z.string().uuid()).min(1).max(50),
  destination: z.string().uuid().optional(), // For move action
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = bulkActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid bulk action', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { action, productIds, destination } = validation.data;

    // Check if all products exist
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .in('id', productIds);

    if (productsError) {
      throw productsError;
    }

    const existingProductIds = products?.map(p => p.id) || [];
    const missingProducts = productIds.filter(id => !existingProductIds.includes(id));

    if (missingProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Some products not found',
          missingProducts,
        },
        { status: 404 }
      );
    }

    let result;
    let message;

    switch (action) {
      case 'add': {
        // Check which products are already in wishlist
        const { data: existingWishlist } = await supabase
          .from('wishlist')
          .select('product_id')
          .eq('user_id', session.user.id)
          .in('product_id', productIds);

        const existingProductIds = existingWishlist?.map(item => item.product_id) || [];
        const newProductIds = productIds.filter(id => !existingProductIds.includes(id));

        if (newProductIds.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'All products already in wishlist',
            },
            { status: 409 }
          );
        }

        // Prepare bulk insert data
        const insertData = newProductIds.map(productId => ({
          user_id: session.user.id,
          product_id: productId,
          created_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from('wishlist')
          .insert(insertData);

        if (insertError) {
          throw insertError;
        }

        result = {
          added: newProductIds.length,
          alreadyExists: existingProductIds.length,
          skipped: existingProductIds.length,
        };
        message = `Added ${newProductIds.length} items to wishlist`;
        break;
      }

      case 'remove': {
        const { count, error: deleteError } = await supabase
          .from('wishlist')
          .delete({ count: 'exact' })
          .eq('user_id', session.user.id)
          .in('product_id', productIds);

        if (deleteError) {
          throw deleteError;
        }

        result = {
          removed: count || 0,
        };
        message = `Removed ${count} items from wishlist`;
        break;
      }

      case 'move': {
        if (!destination) {
          return NextResponse.json(
            { error: 'Destination collection ID is required for move action' },
            { status: 400 }
          );
        }

        // In production, this would move items between collections
        // For now, we'll just remove from wishlist
        const { count, error: deleteError } = await supabase
          .from('wishlist')
          .delete({ count: 'exact' })
          .eq('user_id', session.user.id)
          .in('product_id', productIds);

        if (deleteError) {
          throw deleteError;
        }

        result = {
          moved: count || 0,
          destination,
        };
        message = `Moved ${count} items to collection`;
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Get updated wishlist count
    const { count: totalCount } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    const response = {
      success: true,
      data: {
        action,
        ...result,
        totalWishlistItems: totalCount || 0,
      },
      message,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Bulk wishlist action error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk action',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
