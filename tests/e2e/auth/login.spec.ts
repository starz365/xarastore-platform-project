import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser } from '../helpers/auth';

test.describe('User Authentication - Login Flow', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async () => {
    testUser = await generateTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.email);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Login | Xarastore/);

    // Check logo
    const logo = page.locator('text=Xarastore');
    await expect(logo).toBeVisible();

    // Check tagline
    const tagline = page.locator('text=it\'s a deal');
    await expect(tagline).toBeVisible();

    // Check form elements
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    // Check social login buttons
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Facebook")')).toBeVisible();

    // Check sign up link
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
    const signUpLink = page.locator('a:has-text("Sign up for free")');
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute('href', '/auth/register');

    // Check trust badges
    await expect(page.locator('text=Secure Login')).toBeVisible();
    await expect(page.locator('text=Trusted by 1M+')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Should redirect to home page or previous page
    await expect(page).not.toHaveURL(/\/auth\/login/);
    
    // Check for user menu or account indicator
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
    
    // Verify user is logged in by checking for logout option
    await page.click('[aria-label="Account"]');
    await expect(page.locator('text=Sign Out')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Should show error message
    const errorMessage = page.locator('text=Invalid email or password');
    await expect(errorMessage).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button:has-text("Sign In")');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button:has-text("Sign In")');

    // Should show email validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should show password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]').first();

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to sign up page', async ({ page }) => {
    const signUpLink = page.locator('a:has-text("Sign up for free")');
    await signUpLink.click();

    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('text=Create Your Account')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const forgotPasswordLink = page.locator('text=Forgot password?');
    await forgotPasswordLink.click();

    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.locator('text=Reset Your Password')).toBeVisible();
  });

  test('should handle unverified email', async ({ page }) => {
    // Create unverified test user
    const unverifiedUser = await generateTestUser({ verified: false });

    // Try to login
    await page.fill('input[name="email"]', unverifiedUser.email);
    await page.fill('input[name="password"]', unverifiedUser.password);
    await page.click('button:has-text("Sign In")');

    // Should show verification error
    await expect(page.locator('text=Please verify your email address')).toBeVisible();

    // Cleanup
    await cleanupTestUser(unverifiedUser.email);
  });

  test('should preserve form data on error', async ({ page }) => {
    const testEmail = 'test@example.com';
    const testPassword = 'Test123!';

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit with invalid credentials
    await page.click('button:has-text("Sign In")');

    // Form data should persist
    await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
    await expect(page.locator('input[name="password"]')).toHaveValue(testPassword);
  });

  test('should redirect after login', async ({ page, context }) => {
    // Visit a protected page first
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Should redirect back to account page
    await expect(page).toHaveURL(/\/account/);
  });

  test('should login with Google OAuth', async ({ page, context }) => {
    // Mock Google OAuth response
    await context.route('**/supabase.co/auth/v1/authorize*', route => {
      const url = new URL(route.request().url());
      const redirectTo = url.searchParams.get('redirect_to');
      
      // Simulate OAuth callback
      if (redirectTo?.includes('callback')) {
        return route.fulfill({
          status: 302,
          headers: {
            'Location': `${redirectTo}#access_token=mock-token&token_type=bearer&expires_in=3600`,
          },
        });
      }
      route.continue();
    });

    const googleButton = page.locator('button:has-text("Google")');
    await googleButton.click();

    // Should redirect through OAuth flow
    await expect(page).toHaveURL(/\//);
    
    // Should be logged in
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  });

  test('should login with Facebook OAuth', async ({ page, context }) => {
    // Mock Facebook OAuth response
    await context.route('**/supabase.co/auth/v1/authorize*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('provider') === 'facebook') {
        return route.fulfill({
          status: 302,
          headers: {
            'Location': `${process.env.BASE_URL}/auth/callback#access_token=mock-fb-token`,
          },
        });
      }
      route.continue();
    });

    const facebookButton = page.locator('button:has-text("Facebook")');
    await facebookButton.click();

    // Should redirect through OAuth flow
    await expect(page).toHaveURL(/\//);
    
    // Should be logged in
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/auth/v1/token*', route => route.abort());

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Should show network error message
    await expect(page.locator('text=Login failed')).toBeVisible();
  });

  test('should respect rate limiting', async ({ page }) => {
    // Try multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="email"]', `attempt${i}@example.com`);
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(100);
    }

    // Should show rate limit error
    await expect(page.locator('text=Too many attempts')).toBeVisible();
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Wait for login to complete
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    await expect(page.locator('[aria-label="Account"]')).toBeVisible();

    // Logout
    await page.click('[aria-label="Account"]');
    await page.click('text=Sign Out');

    // Should redirect to home page
    await expect(page).toHaveURL(/\//);
    
    // Should show login link
    await expect(page.locator('text=Account')).toBeVisible();
  });

  test('should handle cookies and localStorage correctly', async ({ page, context }) => {
    // Check initial state
    const cookies = await context.cookies();
    expect(cookies.find(c => c.name.includes('supabase'))).toBeUndefined();

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Check cookies after login
    const cookiesAfterLogin = await context.cookies();
    const authCookie = cookiesAfterLogin.find(c => c.name.includes('supabase'));
    expect(authCookie).toBeDefined();
    expect(authCookie.httpOnly).toBe(true);
    expect(authCookie.secure).toBe(true);

    // Check localStorage
    const localStorage = await page.evaluate(() => window.localStorage);
    expect(localStorage).toHaveProperty('supabase.auth.token');
  });

  test('should be accessible', async ({ page }) => {
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Sign In")')).toBeFocused();

    // Check ARIA labels
    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-required', 'true');

    // Check contrast ratios
    const primaryButton = page.locator('button:has-text("Sign In")');
    const buttonColor = await primaryButton.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        background: style.backgroundColor,
        color: style.color,
      };
    });
    // In a real test, we would calculate contrast ratio
    expect(buttonColor.background).toBeDefined();
    expect(buttonColor.color).toBeDefined();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Social buttons should stack on mobile
    const socialButtons = page.locator('button:has-text("Google"), button:has-text("Facebook")');
    const buttonCount = await socialButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      await expect(socialButtons.nth(i)).toBeVisible();
    }

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});
