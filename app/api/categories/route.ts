import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const querySchema = z.object({
  parentId: z.string().uuid().optional(),
  includeProducts: z.coerce.boolean().default(false),
  productLimit: z.coerce.number().min(1).max(20).default(5),
  depth: z.coerce.number().min(1).max(3).default(1),
});

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      parentId: searchParams.get('parentId'),
      includeProducts: searchParams.get('includeProducts'),
      productLimit: searchParams.get('productLimit'),
      depth: searchParams.get('depth'),
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { parentId, includeProducts, productLimit, depth } = validation.data;

    // Build query
    let query = supabase
      .from('categories')
      .select(`
        id,
        slug,
        name,
        description,
        image,
        product_count,
        parent_id,
        created_at,
        updated_at
      `)
      .order('name');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null); // Top-level categories
    }

    const { data: categories, error } = await query;

    if (error) {
      throw error;
    }

    // Get subcategories if depth > 1
    let categoriesWithChildren = [...(categories || [])];
    
    if (depth > 1 && categoriesWithChildren.length > 0) {
      categoriesWithChildren = await Promise.all(
        categoriesWithChildren.map(async (category) => {
          const { data: subcategories } = await supabase
            .from('categories')
            .select(`
              id,
              slug,
              name,
              description,
              image,
              product_count,
              parent_id
            `)
            .eq('parent_id', category.id)
            .order('name');

          return {
            ...category,
            subcategories: subcategories || [],
          };
        })
      );
    }

    // Include products if requested
    let categoriesWithProducts = categoriesWithChildren;
    
    if (includeProducts && categoriesWithProducts.length > 0) {
      categoriesWithProducts = await Promise.all(
        categoriesWithProducts.map(async (category) => {
          const { data: products } = await supabase
            .from('products')
            .select(`
              id,
              slug,
              name,
              price,
              original_price,
              images,
              rating,
              review_count,
              stock,
              brand:brands(name, slug, logo),
              category:categories(name, slug)
            `)
            .eq('category_id', category.id)
            .gt('stock', 0)
            .order('created_at', { ascending: false })
            .limit(productLimit);

          return {
            ...category,
            featuredProducts: products?.map(product => ({
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              originalPrice: product.original_price,
              images: product.images || [],
              rating: product.rating,
              reviewCount: product.review_count,
              stock: product.stock,
              brand: product.brand,
              category: product.category,
            })) || [],
          };
        })
      );
    }

    // Calculate statistics
    const totalProducts = categoriesWithProducts.reduce(
      (sum, category) => sum + (category.product_count || 0), 0
    );

    const totalCategories = categoriesWithProducts.length;
    
    // Get category hierarchy for breadcrumbs
    const categoryHierarchy = await buildCategoryHierarchy();

    const response = {
      success: true,
      data: {
        categories: categoriesWithProducts,
        statistics: {
          totalCategories,
          totalProducts,
          averageProductsPerCategory: totalCategories > 0 
            ? Math.round(totalProducts / totalCategories)
            : 0,
        },
        hierarchy: categoryHierarchy,
      },
      meta: {
        count: categoriesWithProducts.length,
        depth,
        includeProducts,
        timestamp: new Date().toISOString(),
        cache: 'hit',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400',
        'X-Total-Categories': totalCategories.toString(),
        'X-Total-Products': totalProducts.toString(),
      },
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        message: error.message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}

async function buildCategoryHierarchy(): Promise<any[]> {
  try {
    // Get all categories
    const { data: allCategories } = await supabase
      .from('categories')
      .select(`
        id,
        slug,
        name,
        parent_id,
        product_count
      `)
      .order('name');

    if (!allCategories) return [];

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Create map of all categories
    allCategories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    });

    // Build tree
    allCategories.forEach(category => {
      const node = categoryMap.get(category.id);
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    });

    return rootCategories;
  } catch (error) {
    console.error('Failed to build category hierarchy:', error);
    return [];
  }
}
