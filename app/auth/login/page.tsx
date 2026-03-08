'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/components/shared/Toast'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60000

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [attempts, setAttempts] = useState(0)
  const [windowStart, setWindowStart] = useState<number | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        toast.info('You are already logged in.')
        router.push('/')
      }
    }

    checkSession()
  }, [])

  const rateLimitCheck = () => {
    const now = Date.now()

    if (!windowStart || now - windowStart > WINDOW_MS) {
      setWindowStart(now)
      setAttempts(1)
      return true
    }

    if (attempts >= MAX_ATTEMPTS) {
      toast.error('Too many login attempts', {
        description: 'Please wait a moment before trying again.',
      })
      return false
    }

    setAttempts((a) => a + 1)
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rateLimitCheck()) return

    if (!email || !password) {
      toast.warning('Missing credentials', {
        description: 'Please enter both email and password.',
      })
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      if (data.user) {
        toast.success('Login successful', {
          description: `Welcome back ${data.user.email}`,
        })

        const redirect = localStorage.getItem('redirectAfterLogin') || '/'
        localStorage.removeItem('redirectAfterLogin')

        router.push(redirect)
      }
    } catch (err: any) {
      const message = err?.message || ''

      if (message.includes('Invalid login credentials')) {
        toast.error('Incorrect email or password')
      }

      else if (message.includes('Email not confirmed')) {
        toast.warning('Email not verified', {
          description:
            'Please check your email for the verification link.',
        })

        toast.info('Need a new link?', {
          description: 'Try logging in again to resend verification.',
        })
      }

      else {
        toast.error('Login failed', {
          description: message || 'Unexpected error occurred.',
        })
      }

      // OTP fallback prompt
      toast.info('Having trouble logging in?', {
        description: 'You can request an OTP login if password fails.',
      })
    }

    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })
    } catch {
      toast.error('Social login failed')
    }
  }

  const forgotPassword = async () => {
    if (!email) {
      toast.warning('Enter your email first')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      toast.error('Password reset failed')
    } else {
      toast.success('Reset email sent', {
        description: 'Check your inbox.',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-gray-500">Login to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label>Password</label>

            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

              <Input
                type={showPassword ? 'text' : 'password'}
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="button"
              onClick={forgotPassword}
              className="text-xs text-red-600 mt-1"
            >
              Forgot password?
            </button>
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

        </form>

        <div className="text-center text-sm text-gray-500">
          Don’t have an account?{' '}
          <Link href="/auth/register" className="text-red-600 font-medium">
            Create one
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() => handleOAuth('google')}
          >
            Google
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleOAuth('facebook')}
          >
            Facebook
          </Button>
        </div>

      </div>
    </div>
  )
}
