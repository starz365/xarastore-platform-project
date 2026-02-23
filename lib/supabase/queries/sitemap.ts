import { supabase } from '../client';

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('slug, updated_at, name, description, images')
    .gt('stock', 0)
    .order('updated_at', { ascending: false })
    .limit(10000); // Limit for sitemap size

  if (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }

  return data || [];
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, updated_at, name, image')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching categories for sitemap:', error);
    return [];
  }

  return data || [];
}

export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('slug, updated_at, name, logo')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching brands for sitemap:', error);
    return [];
  }

  return data || [];
}

export async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('slug, updated_at, name, image')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching collections for sitemap:', error);
    return [];
  }

  return data || [];
}
