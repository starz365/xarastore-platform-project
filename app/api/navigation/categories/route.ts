import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/supabase/queries/products'
import { rankCategories } from '@/lib/navigation/navigationRanking'
import { getCache,setCache } from '@/lib/navigation/navigationCache'

const TTL = 60 * 1000

export async function GET() {

  const cached = getCache('nav_categories')

  if (cached) {
    return NextResponse.json(cached)
  }

  const categories = await getCategories()

  const ranked = rankCategories(categories)

  setCache('nav_categories', ranked, TTL)

  return NextResponse.json(ranked)

}

