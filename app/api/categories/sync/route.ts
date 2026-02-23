import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // This API endpoint syncs category data with frontend
    // Can be used for generating sitemaps, updating caches, etc.
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, slug, name, parent_id, product_count, updated_at')
      .order('sort_order')
      .order('name');

    if (error) throw error;

    // Build category tree
    const categoryTree = buildCategoryTree(categories || []);

    return NextResponse.json({
      success: true,
      categories: categoryTree,
      total: categories?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Category sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync categories',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be used by admin dashboard to update categories
    // It's protected by middleware authentication
    
    const body = await request.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json(
        { error: 'Missing action or data' },
        { status: 400 }
      );
    }

    // Verify admin access (in production, check user role)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'create':
        const { data: created, error: createError } = await supabase
          .from('categories')
          .insert(data)
          .select()
          .single();

        if (createError) throw createError;
        return NextResponse.json({ success: true, category: created });

      case 'update':
        const { id, ...updateData } = data;
        const { data: updated, error: updateError } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, category: updated });

      case 'delete':
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', data.id);

        if (deleteError) throw deleteError;
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Category management error:', error);
    
    return NextResponse.json(
      {
        error: 'Category operation failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to build category tree
function buildCategoryTree(categories: any[], parentId: string | null = null) {
  const tree: any[] = [];
  
  categories
    .filter(category => category.parent_id === parentId)
    .forEach(category => {
      const children = buildCategoryTree(categories, category.id);
      tree.push({
        ...category,
        children: children.length > 0 ? children : undefined,
      });
    });

  return tree.sort((a, b) => a.sort_order - b.sort_order);
}
