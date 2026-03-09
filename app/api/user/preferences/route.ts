import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const themeSchema = z.object({
  theme: z.enum(['light', 'dark']),
})

const notificationsSchema = z.object({
  marketing: z.boolean(),
  security: z.boolean(),
  billing: z.boolean(),
  updates: z.boolean(),
})

export const GET = withAuth(async (session) => {
  try {
    const supabase = await createClient()

    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (prefsError) {
      console.error('Preferences fetch error:', prefsError)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    if (!preferences) {
      return NextResponse.json({
        theme: 'light',
        notifications: {
          marketing: true,
          security: true,
          billing: true,
          updates: false,
        },
      })
    }

    return NextResponse.json({
      theme: preferences.theme,
      notifications: preferences.notifications,
    })
  } catch (error) {
    console.error('Preferences API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
