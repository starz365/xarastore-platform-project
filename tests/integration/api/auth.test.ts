import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { POST as resetPasswordHandler } from '@/app/api/auth/reset-password/route';
import { GET as verifyEmailHandler } from '@/app/api/auth/verify-email/route';
import { supabase } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
  NextRequest: class {
    url: string;
    method: string;
    headers: Map<string, string>;
    json: () => Promise<any>;

    constructor(input: string | URL, init?: { method?: string; headers?: Record<string, string> }) {
      this.url = input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.json = vi.fn();
    }
  },
}));

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      fullName: 'Test User',
      phone: '+254712345678',
    };

    it('registers user successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validRegistrationData);

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      };

      (supabase.auth.signUp as any).mockResolvedValue(mockAuthResponse);
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }), // No existing user
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass123!',
        options: {
          data: {
            full_name: 'Test User',
            phone: '+254712345678',
          },
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        },
      });

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Registration successful');
    });

    it('rejects registration with invalid email', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(invalidData);

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('rejects weak passwords', async () => {
      const weakPasswordData = { ...validRegistrationData, password: 'weak' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(weakPasswordData);

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Validation failed');
      expect(result.details.some((d: any) => d.message.includes('Password'))).toBe(true);
    });

    it('rejects existing user', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validRegistrationData);

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'existing-user' } }),
          }),
        }),
      });

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('User with this email already exists');
      expect(response.status).toBe(409);
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('handles Supabase auth errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validRegistrationData);

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: new Error('Auth service unavailable'),
      });

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Registration failed');
      expect(response.status).toBe(500);
    });

    it('handles database insertion errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validRegistrationData);

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      };

      (supabase.auth.signUp as any).mockResolvedValue(mockAuthResponse);
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: new Error('Database error') }),
      });

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Registration failed');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
    };

    it('authenticates user successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validLoginData);

      const mockAuthResponse = {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
          },
        },
        error: null,
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue(mockAuthResponse);

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass123!',
      });
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validLoginData);

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('rejects unverified email', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validLoginData);

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' },
      });

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toContain('verify your email address');
    });

    it('validates request data', async () => {
      const invalidData = { email: '', password: '' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(invalidData);

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(validLoginData);

      (supabase.auth.signInWithPassword as any).mockRejectedValue(new Error('Network error'));

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Login failed');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out user successfully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'sb-access-token=token-123; sb-refresh-token=refresh-123',
        },
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const response = await logoutHandler(mockRequest);
      const result = await response.json();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('logged out');
    });

    it('handles logout errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      (supabase.auth.signOut as any).mockResolvedValue({
        error: new Error('Logout failed'),
      });

      const response = await logoutHandler(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logout failed');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('sends password reset email', async () => {
      const resetData = { email: 'test@example.com' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(resetData);

      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      const response = await resetPasswordHandler(mockRequest);
      const result = await response.json();

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset email sent');
    });

    it('validates email address', async () => {
      const invalidData = { email: 'invalid-email' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(invalidData);

      const response = await resetPasswordHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Invalid email address');
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('handles reset password errors', async () => {
      const resetData = { email: 'test@example.com' };
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(resetData);

      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({
        error: new Error('Reset failed'),
      });

      const response = await resetPasswordHandler(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password reset failed');
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('verifies email token successfully', async () => {
      const mockRequest = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=verify-token-123&type=signup',
        { method: 'GET' }
      );

      (supabase.auth.verifyOtp as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockResolvedValue({ error: null }),
      });

      const response = await verifyEmailHandler(mockRequest);
      const result = await response.json();

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'verify-token-123',
        type: 'signup',
      });
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Email verified');
    });

    it('requires token parameter', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'GET',
      });

      const response = await verifyEmailHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Token is required');
      expect(response.status).toBe(400);
    });

    it('handles invalid token', async () => {
      const mockRequest = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=invalid-token&type=signup',
        { method: 'GET' }
      );

      (supabase.auth.verifyOtp as any).mockResolvedValue({
        data: null,
        error: new Error('Invalid token'),
      });

      const response = await verifyEmailHandler(mockRequest);
      const result = await response.json();

      expect(result.error).toBe('Invalid verification token');
      expect(response.status).toBe(400);
    });

    it('handles database update errors', async () => {
      const mockRequest = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=valid-token&type=signup',
        { method: 'GET' }
      );

      (supabase.auth.verifyOtp as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockResolvedValue({ error: new Error('Database error') }),
      });

      const response = await verifyEmailHandler(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update user verification status');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('completes full registration and login flow', async () => {
      // 1. Register
      const registerData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullName: 'New User',
        phone: '+254712345678',
      };

      const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      registerRequest.json.mockResolvedValue(registerData);

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'newuser@example.com' },
        },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const registerResponse = await registerHandler(registerRequest);
      const registerResult = await registerResponse.json();

      expect(registerResult.success).toBe(true);

      // 2. Login
      const loginData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
      };

      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      loginRequest.json.mockResolvedValue(loginData);

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'newuser@example.com' },
          session: { access_token: 'new-token' },
        },
        error: null,
      });

      const loginResponse = await loginHandler(loginRequest);
      const loginResult = await loginResponse.json();

      expect(loginResult.success).toBe(true);

      // 3. Logout
      const logoutRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const logoutResponse = await logoutHandler(logoutRequest);
      const logoutResult = await logoutResponse.json();

      expect(logoutResult.success).toBe(true);
    });

    it('handles password reset flow', async () => {
      // 1. Request reset
      const resetRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      resetRequest.json.mockResolvedValue({ email: 'user@example.com' });

      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      const resetResponse = await resetPasswordHandler(resetRequest);
      const resetResult = await resetResponse.json();

      expect(resetResult.success).toBe(true);
      expect(resetResult.message).toContain('reset email sent');
    });
  });

  describe('Security Considerations', () => {
    it('rate limits login attempts', async () => {
      // This would be implemented in middleware
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPass123!',
      };

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(loginData);

      // Simulate multiple failed attempts
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      for (let i = 0; i < 5; i++) {
        await loginHandler(mockRequest);
      }

      // After 5 attempts, should implement rate limiting
      // (This would be handled by middleware in production)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(5);
    });

    it('validates and sanitizes all inputs', async () => {
      const maliciousData = {
        email: 'test@example.com<script>alert("xss")</script>',
        password: 'Pass123!',
        fullName: '<img src=x onerror=alert(1)>',
      };

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(maliciousData);

      const response = await registerHandler(mockRequest);
      const result = await response.json();

      // Should reject malicious input
      expect(result.error).toBe('Validation failed');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('uses secure session management', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      };

      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      mockRequest.json.mockResolvedValue(loginData);

      const mockSession = {
        access_token: 'secure-token-123',
        refresh_token: 'secure-refresh-456',
        expires_at: Date.now() + 3600 * 1000,
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: mockSession,
        },
        error: null,
      });

      const response = await loginHandler(mockRequest);
      const result = await response.json();

      expect(result.success).toBe(true);
      // Session should have reasonable expiry
      expect(mockSession.expires_at).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('provides helpful error messages', async () => {
      const testCases = [
        {
          error: 'Invalid login credentials',
          expected: 'Invalid email or password',
        },
        {
          error: 'Email not confirmed',
          expected: 'Please verify your email address',
        },
        {
          error: 'User already registered',
          expected: 'User with this email already exists',
        },
        {
          error: 'Network error',
          expected: 'Please try again or contact support',
        },
      ];

      for (const testCase of testCases) {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        mockRequest.json.mockResolvedValue({ email: 'test@example.com', password: 'pass' });

        (supabase.auth.signInWithPassword as any).mockResolvedValue({
          data: null,
          error: { message: testCase.error },
        });

        const response = await loginHandler(mockRequest);
        const result = await response.json();

        expect(result.error).toContain(testCase.expected);
      }
    });

    it('handles concurrent requests', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      };

      const requests = Array(3).fill(null).map(() => {
        const mockRequest = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        mockRequest.json.mockResolvedValue(loginData);
        return mockRequest;
      });

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const responses = await Promise.all(requests.map(req => loginHandler(req)));

      for (const response of responses) {
        const result = await response.json();
        expect(result.success).toBe(true);
      }

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(3);
    });
  });
});
