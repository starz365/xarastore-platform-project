import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

const supabase = createClient<Database>()

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) {
    console.error('[getCategories]', error)
    return []
  }

  return data
}

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      price,
      original_price,
      images,
      rating,
      review_count
    `)
    .eq('is_featured', true)
    .limit(limit)

  if (error) {
    console.error('[getFeaturedProducts]', error)
    return []
  }

  return data
}
