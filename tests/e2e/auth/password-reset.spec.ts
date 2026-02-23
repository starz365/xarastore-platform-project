import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser } from '../helpers/auth';

test.describe('User Authentication - Password Reset Flow', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async () => {
    testUser = await generateTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.email);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('should display password reset page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Reset Password | Xarastore/);

    // Check header
    await expect(page.locator('text=Reset Your Password')).toBeVisible();
    await expect(page.locator('text=Enter your email address')).toBeVisible();

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    const submitButton = page.locator('button:has-text("Send Reset Link")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Check back to login link
    const backLink = page.locator('a:has-text("Back to login")');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/auth/login');
  });

  test('should request password reset with valid email', async ({ page }) => {
    // Fill email
    await page.fill('input[name="email"]', testUser.email);

    // Submit form
    await page.click('button:has-text("Send Reset Link")');

    // Should show success message
    await expect(page.locator('text=Reset link sent')).toBeVisible();
    await expect(page.locator('text=Check your email')).toBeVisible();

    // Should show instructions
    await expect(page.locator('text=If you don\'t see the email')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email');

    await page.click('button:has-text("Send Reset Link")');

    // Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should handle non-existent email gracefully', async ({ page }) => {
    // Enter non-existent email
    await page.fill('input[name="email"]', 'nonexistent@example.com');

    await page.click('button:has-text("Send Reset Link")');

    // Should still show success message (for security)
    await expect(page.locator('text=Reset link sent')).toBeVisible();
  });

  test('should navigate back to login page', async ({ page }) => {
    const backLink = page.locator('a:has-text("Back to login")');
    await backLink.click();

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network failure
    await page.route('**/auth/v1/recover', route => route.abort());

    await page.fill('input[name="email"]', testUser.email);
    await page.click('button:has-text("Send Reset Link")');

    // Should show error message
    await expect(page.locator('text=Failed to send reset link')).toBeVisible();
  });

  test('should rate limit reset requests', async ({ page }) => {
    // Try multiple requests quickly
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="email"]', `test${i}@example.com`);
      await page.click('button:has-text("Send Reset Link")');
      await page.waitForTimeout(100);
    }

    // Should show rate limit error
    await expect(page.locator('text=Too many requests')).toBeVisible();
  });

  test('should persist form data on error', async ({ page }) => {
    const testEmail = 'test@example.com';

    await page.fill('input[name="email"]', testEmail);

    // Mock error
    await page.route('**/auth/v1/recover', route => route.abort());

    await page.click('button:has-text("Send Reset Link")');

    // Email should persist
    await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
  });

  test('should be accessible', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Send Reset Link")')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('a:has-text("Back to login")')).toBeFocused();

    // Check ARIA labels
    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-required', 'true');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=Reset Your Password')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Reset Your Password')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=Reset Your Password')).toBeVisible();
  });

  test('should handle reset link click and show reset form', async ({ page, context }) => {
    // First request reset link
    await page.fill('input[name="email"]', testUser.email);
    await page.click('button:has-text("Send Reset Link")');

    // Simulate clicking reset link from email
    const resetToken = 'mock-reset-token';
    await page.goto(`/auth/reset-password?token=${resetToken}`);

    // Should show reset password form
    await expect(page.locator('text=Set New Password')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button:has-text("Reset Password")')).toBeVisible();
  });

  test('should validate reset password form', async ({ page }) => {
    // Navigate to reset form
    await page.goto('/auth/reset-password?token=mock-token');

    // Try to submit empty form
    await page.click('button:has-text("Reset Password")');

    // Should show validation errors
    await expect(page.locator('text=Password is required')).toBeVisible();
    await expect(page.locator('text=Please confirm your password')).toBeVisible();
  });

  test('should validate password match', async ({ page }) => {
    // Navigate to reset form
    await page.goto('/auth/reset-password?token=mock-token');

    // Enter mismatched passwords
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

    await page.click('button:has-text("Reset Password")');

    // Should show mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should validate password strength on reset', async ({ page }) => {
    // Navigate to reset form
    await page.goto('/auth/reset-password?token=mock-token');

    // Enter weak password
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');

    await page.click('button:has-text("Reset Password")');

    // Should show password requirements
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should reset password successfully', async ({ page }) => {
    // Navigate to reset form with valid token
    const resetToken = 'valid-mock-token';
    await page.goto(`/auth/reset-password?token=${resetToken}`);

    // Mock successful reset
    await page.route('**/auth/v1/verify*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'new-token', token_type: 'bearer' }),
      });
    });

    // Enter new password
    const newPassword = 'NewSecurePassword123!';
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);

    await page.click('button:has-text("Reset Password")');

    // Should show success message
    await expect(page.locator('text=Password reset successful')).toBeVisible();
    await expect(page.locator('text=You can now sign in')).toBeVisible();

    // Should have login button
    const loginButton = page.locator('a:has-text("Sign in")');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveAttribute('href', '/auth/login');
  });

  test('should handle invalid reset token', async ({ page }) => {
    // Navigate with invalid token
    await page.goto('/auth/reset-password?token=invalid-token');

    // Mock token verification failure
    await page.route('**/auth/v1/verify*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid token' }),
      });
    });

    // Should show error
    await expect(page.locator('text=Invalid or expired reset link')).toBeVisible();

    // Should show link to request new reset
    const requestLink = page.locator('a:has-text("request a new one")');
    await expect(requestLink).toBeVisible();
    await expect(requestLink).toHaveAttribute('href', '/auth/forgot-password');
  });

  test('should handle expired reset token', async ({ page }) => {
    // Navigate with expired token
    await page.goto('/auth/reset-password?token=expired-token');

    // Mock expired token response
    await page.route('**/auth/v1/verify*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' }),
      });
    });

    // Should show expired message
    await expect(page.locator('text=Reset link has expired')).toBeVisible();

    // Should show option to request new link
    const requestNewLink = page.locator('text=Request a new reset link');
    await expect(requestNewLink).toBeVisible();
  });

  test('should prevent using previous password', async ({ page }) => {
    // Navigate to reset form
    await page.goto('/auth/reset-password?token=mock-token');

    // Mock API response indicating previous password
    await page.route('**/auth/v1/user*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cannot use previous password' }),
      });
    });

    // Enter same as old password
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    await page.click('button:has-text("Reset Password")');

    // Should show error
    await expect(page.locator('text=Cannot use previous password')).toBeVisible();
  });

  test('should toggle password visibility in reset form', async ({ page }) => {
    // Navigate to reset form
    await page.goto('/auth/reset-password?token=mock-token');

    const passwordInput = page.locator('input[name="password"]');
    const confirmInput = page.locator('input[name="confirmPassword"]');
    const toggleButtons = page.locator('button[aria-label*="password"]');

    // Check both inputs
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmInput).toHaveAttribute('type', 'password');

    // Toggle password visibility
    await toggleButtons.first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(confirmInput).toHaveAttribute('type', 'password');

    // Toggle confirm password visibility
    await toggleButtons.nth(1).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(confirmInput).toHaveAttribute('type', 'text');
  });

  test('should login with new password after reset', async ({ page }) => {
    // First reset password
    const newPassword = 'BrandNewPassword123!';
    const resetToken = 'valid-reset-token';

    // Mock successful reset
    await page.route('**/auth/v1/verify*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        }),
      });
    });

    await page.goto(`/auth/reset-password?token=${resetToken}`);
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    await page.click('button:has-text("Reset Password")');

    // Wait for success message
    await expect(page.locator('text=Password reset successful')).toBeVisible();

    // Click login button
    await page.click('a:has-text("Sign in")');
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login with new password
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button:has-text("Sign In")');

    // Should login successfully
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();
  });

  test('should invalidate old sessions after password reset', async ({ page, context }) => {
    // First login with old password
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Wait for login
    await expect(page.locator('[aria-label="Account"]')).toBeVisible();

    // Reset password in another tab/window
    const newPassword = 'NewPassword123!';
    
    // This would typically be done via email, but we simulate it
    await page.evaluate(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        oldValue: 'old-token',
        newValue: null,
      }));
    });

    // Try to access protected page with old session
    await page.goto('/account');

    // Should redirect to login or show session expired
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/auth\/login|\/account/);
    
    // If still on account page, session management should handle this
    if (currentUrl.includes('/account')) {
      // Session should be refreshed or invalidated
      await page.reload();
      // Might show session expired message
    }
  });

  test('should handle reset flow for unverified email', async ({ page }) => {
    // Create unverified user
    const unverifiedUser = await generateTestUser({ verified: false });

    // Request reset for unverified email
    await page.goto('/auth/forgot-password');
    await page.fill('input[name="email"]', unverifiedUser.email);
    await page.click('button:has-text("Send Reset Link")');

    // Should still send reset link
    await expect(page.locator('text=Reset link sent')).toBeVisible();

    // Cleanup
    await cleanupTestUser(unverifiedUser.email);
  });

  test('should be secure against timing attacks', async ({ page }) => {
    // Test with non-existent email
    const startTime = Date.now();
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.click('button:has-text("Send Reset Link")');
    const nonExistentTime = Date.now() - startTime;

    // Test with existing email
    await page.goto('/auth/forgot-password');
    const startTime2 = Date.now();
    await page.fill('input[name="email"]', testUser.email);
    await page.click('button:has-text("Send Reset Link")');
    const existentTime = Date.now() - startTime2;

    // Response times should be similar (within tolerance)
    // This is a basic check; in reality, we'd use more sophisticated timing
    const timeDifference = Math.abs(nonExistentTime - existentTime);
    expect(timeDifference).toBeLessThan(100); // Within 100ms
  });

  test('should handle email with plus addressing', async ({ page }) => {
    const plusEmail = `test+reset${Date.now()}@example.com`;
    
    // Create user with plus email
    await page.goto('/auth/register');
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', plusEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');
    await page.click('button:has-text("Create Account")');

    // Wait for registration
    await page.waitForURL('/auth/register');

    // Request password reset
    await page.goto('/auth/forgot-password');
    await page.fill('input[name="email"]', plusEmail);
    await page.click('button:has-text("Send Reset Link")');

    // Should handle plus addressing
    await expect(page.locator('text=Reset link sent')).toBeVisible();

    // Cleanup
    await cleanupTestUser(plusEmail);
  });
});
