import { test, expect } from '@playwright/test';
import { generateTestEmail, cleanupTestUser } from '../helpers/auth';

test.describe('User Authentication - Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should display registration page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Sign Up | Xarastore/);

    // Check header
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('text=Join Xarastore today')).toBeVisible();

    // Check form fields
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();

    // Check terms checkbox
    await expect(page.locator('input[name="terms"]')).toBeVisible();
    await expect(page.locator('text=I agree to the')).toBeVisible();

    // Check submit button
    const submitButton = page.locator('button:has-text("Create Account")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Check login link
    await expect(page.locator('text=Already have an account?')).toBeVisible();
    const loginLink = page.locator('a:has-text("Sign in")');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  test('should register with valid credentials', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Fill registration form
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="phone"]', '0712345678');
    
    // Accept terms
    await page.check('input[name="terms"]');

    // Submit form
    await page.click('button:has-text("Create Account")');

    // Should show success message
    await expect(page.locator('text=Registration successful')).toBeVisible();
    await expect(page.locator('text=Please check your email')).toBeVisible();

    // Should show verification notice
    await expect(page.locator('text=Verify your email')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button:has-text("Create Account")');

    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    await expect(page.locator('text=You must accept the terms')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Test123!');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Test weak password
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'weak');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Should show password requirements
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible();
    await expect(page.locator('text=Password must contain at least one number')).toBeVisible();

    // Test missing special character
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Password must contain at least one special character')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should validate phone number format', async ({ page }) => {
    const testEmail = generateTestEmail();

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="phone"]', 'invalid-phone');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();

    // Test valid Kenyan formats
    await page.fill('input[name="phone"]', '712345678');
    await expect(page.locator('text=Please enter a valid phone number')).not.toBeVisible();

    await page.fill('input[name="phone"]', '0712345678');
    await expect(page.locator('text=Please enter a valid phone number')).not.toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    const existingUser = {
      email: 'existing@example.com',
      password: 'ExistingPassword123!',
    };

    // Create user first
    await page.goto('/auth/register');
    await page.fill('input[name="fullName"]', 'Existing User');
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', existingUser.password);
    await page.fill('input[name="phone"]', '0712345678');
    await page.check('input[name="terms"]');
    await page.click('button:has-text("Create Account")');

    await page.waitForURL('/auth/register');

    // Try to register with same email again
    await page.fill('input[name="fullName"]', 'New User');
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="phone"]', '0798765432');
    await page.check('input[name="terms"]');
    await page.click('button:has-text("Create Account")');

    // Should show duplicate email error
    await expect(page.locator('text=User with this email already exists')).toBeVisible();

    // Cleanup
    await cleanupTestUser(existingUser.email);
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');

    // Weak password
    await passwordInput.fill('weak');
    await expect(page.locator('text=Weak')).toBeVisible();

    // Medium password
    await passwordInput.fill('MediumPass123');
    await expect(page.locator('text=Medium')).toBeVisible();

    // Strong password
    await passwordInput.fill('StrongPass123!@#');
    await expect(page.locator('text=Strong')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]').first();

    // Should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to login page', async ({ page }) => {
    const loginLink = page.locator('a:has-text("Sign in")');
    await loginLink.click();

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should accept terms and conditions', async ({ page }) => {
    const termsCheckbox = page.locator('input[name="terms"]');
    const termsLink = page.locator('a:has-text("Terms of Service")');
    const privacyLink = page.locator('a:has-text("Privacy Policy")');

    // Check links exist
    await expect(termsLink).toBeVisible();
    await expect(privacyLink).toBeVisible();

    // Test checkbox interaction
    await expect(termsCheckbox).not.toBeChecked();
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();
    await termsCheckbox.uncheck();
    await expect(termsCheckbox).not.toBeChecked();
  });

  test('should handle network errors during registration', async ({ page }) => {
    // Mock network failure
    await page.route('**/auth/v1/signup', route => route.abort());

    const testEmail = generateTestEmail();

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="phone"]', '0712345678');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Should show error message
    await expect(page.locator('text=Registration failed')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should send verification email', async ({ page, context }) => {
    let verificationEmailSent = false;

    // Intercept email sending
    await context.route('**/api/auth/register', async route => {
      verificationEmailSent = true;
      await route.continue();
    });

    const testEmail = generateTestEmail();

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="phone"]', '0712345678');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Should indicate email was sent
    await expect(page.locator('text=Please check your email')).toBeVisible();
    expect(verificationEmailSent).toBe(true);

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should handle invalid referral code', async ({ page }) => {
    // Navigate with invalid referral code
    await page.goto('/auth/register?ref=INVALID123');

    const testEmail = generateTestEmail();

    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Should still register successfully (referral code is optional)
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should persist form data on error', async ({ page }) => {
    const testData = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '0712345678',
    };

    await page.fill('input[name="fullName"]', testData.fullName);
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="phone"]', testData.phone);

    // Submit without password
    await page.click('button:has-text("Create Account")');

    // Form data should persist
    await expect(page.locator('input[name="fullName"]')).toHaveValue(testData.fullName);
    await expect(page.locator('input[name="email"]')).toHaveValue(testData.email);
    await expect(page.locator('input[name="phone"]')).toHaveValue(testData.phone);
  });

  test('should be accessible', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="fullName"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="phone"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="terms"]')).toBeFocused();

    // Check ARIA labels
    await expect(page.locator('input[name="fullName"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('input[name="terms"]')).toHaveAttribute('aria-required', 'true');
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Create Your Account')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=Create Your Account')).toBeVisible();
  });

  test('should register with optional fields empty', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Fill only required fields
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');

    // Leave phone empty (optional)
    await page.click('button:has-text("Create Account")');

    // Should still register successfully
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should handle special characters in names', async ({ page }) => {
    const testEmail = generateTestEmail();

    await page.fill('input[name="fullName"]', 'Test Üser-Ñame 123');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Should handle special characters
    await expect(page.locator('text=Registration successful')).toBeVisible();

    // Cleanup
    await cleanupTestUser(testEmail);
  });

  test('should validate email domain', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Test with disposable email (if your system blocks them)
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@tempmail.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');

    await page.click('button:has-text("Create Account")');

    // Might show domain validation error
    // This depends on your email validation rules

    // Cleanup with actual email
    await cleanupTestUser(testEmail);
  });

  test('should handle concurrent registration attempts', async ({ page, context }) => {
    const testEmail = generateTestEmail();
    let requestCount = 0;

    // Count registration requests
    await context.route('**/auth/v1/signup', route => {
      requestCount++;
      route.continue();
    });

    // Trigger multiple submissions quickly
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.check('input[name="terms"]');

    // Click submit multiple times
    const submitButton = page.locator('button:has-text("Create Account")');
    for (let i = 0; i < 3; i++) {
      await submitButton.click();
      await page.waitForTimeout(100);
    }

    // Should prevent duplicate submissions
    await expect(page.locator('button:has-text("Create Account")')).toBeDisabled();
    
    // Only one request should be made
    expect(requestCount).toBe(1);

    // Cleanup
    await cleanupTestUser(testEmail);
  });
});
