import { NextRequest,NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {

  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('id,name,slug,price,image')
    .eq('category_slug', slug)
    .limit(6)

  return NextResponse.json(data || [])

}

