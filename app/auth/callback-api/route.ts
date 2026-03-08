import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hash = url.searchParams.get('hash') || ''
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      return NextResponse.json({ success: false, error: errorDescription || error })
    }

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ success: false, error: 'Missing authentication tokens' })
    }

    // Set the session securely server-side
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError) throw sessionError

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) throw new Error('Failed to establish session')

    // Ensure user exists in DB
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (!existingUser) {
      await supabase.from('users').insert({
        id: session.user.id,
        email: session.user.email,
        full_name:
          session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        avatar_url:
          session.user.user_metadata?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            session.user.email?.split('@')[0] || 'User',
          )}&background=dc2626&color=fff`,
        email_verified: session.user.email_confirmed_at !== null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } else {
      await supabase
        .from('users')
        .update({
          email_verified: session.user.email_confirmed_at !== null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
    }

    // Return redirect info to page.tsx
    const redirectTo = '/'

    return NextResponse.json({ success: true, redirectTo })
  } catch (error: any) {
    console.error('Server auth error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Authentication failed' })
  }
}
