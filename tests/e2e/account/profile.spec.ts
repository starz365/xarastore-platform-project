import { test, expect } from '@playwright/test';
import { supabase } from '@/lib/supabase/client';

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@xarastore.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/account/profile');
  });

  test('update profile information', async ({ page }) => {
    // Update name
    await page.fill('input[name="fullName"]', 'Updated Test User');
    await page.fill('input[name="phone"]', '0723456789');
    
    // Mock profile update
    await page.route('**/api/account/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Profile updated successfully',
        }),
      });
    });

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();

    // Verify updates persisted
    const nameInput = await page.inputValue('input[name="fullName"]');
    const phoneInput = await page.inputValue('input[name="phone"]');
    expect(nameInput).toBe('Updated Test User');
    expect(phoneInput).toBe('0723456789');
  });

  test('update email address', async ({ page }) => {
    await page.click('button:has-text("Change Email")');
    
    await page.fill('input[name="newEmail"]', 'newemail@xarastore.com');
    await page.fill('input[name="currentPassword"]', 'Test123!@#');

    await page.route('**/api/account/email', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verification email sent',
        }),
      });
    });

    await page.click('button:has-text("Update Email")');
    await expect(page.locator('text=Verification email sent')).toBeVisible();
  });

  test('change password', async ({ page }) => {
    await page.click('button:has-text("Change Password")');
    
    await page.fill('input[name="currentPassword"]', 'Test123!@#');
    await page.fill('input[name="newPassword"]', 'NewPass123!@#');
    await page.fill('input[name="confirmPassword"]', 'NewPass123!@#');

    await page.route('**/api/account/password', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password updated successfully',
        }),
      });
    });

    await page.click('button:has-text("Update Password")');
    await expect(page.locator('text=Password updated successfully')).toBeVisible();
  });

  test('profile validation errors', async ({ page }) => {
    // Test invalid phone number
    await page.fill('input[name="phone"]', '123');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Invalid phone number')).toBeVisible();

    // Test empty name
    await page.fill('input[name="fullName"]', '');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Full name is required')).toBeVisible();

    // Test password mismatch
    await page.click('button:has-text("Change Password")');
    await page.fill('input[name="newPassword"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password456');
    await page.click('button:has-text("Update Password")');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('profile picture upload', async ({ page }) => {
    // Upload profile picture
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'profile.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test'),
    });

    await page.route('**/api/account/avatar', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: 'https://example.com/avatar.jpg',
        }),
      });
    });

    await expect(page.locator('text=Uploading...')).toBeVisible();
    await expect(page.locator('text=Profile picture updated')).toBeVisible();
  });

  test('account preferences', async ({ page }) => {
    // Update notification preferences
    await page.click('label:has-text("Email notifications")');
    await page.click('label:has-text("SMS notifications")');
    
    // Update newsletter preference
    await page.click('label:has-text("Subscribe to newsletter")');

    await page.route('**/api/account/preferences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
        }),
      });
    });

    await page.click('button:has-text("Save Preferences")');
    await expect(page.locator('text=Preferences saved')).toBeVisible();
  });

  test('account deletion', async ({ page }) => {
    await page.click('button:has-text("Delete Account")');
    
    // Confirm deletion
    await page.fill('input[name="confirmation"]', 'DELETE');
    await page.fill('input[name="password"]', 'Test123!@#');

    await page.route('**/api/account/delete', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Account deleted successfully',
        }),
      });
    });

    await page.click('button:has-text("Permanently Delete Account")');
    await page.waitForURL('/');
    await expect(page.locator('text=Account deleted successfully')).toBeVisible();
  });

  test('session management', async ({ page, context }) => {
    // Verify active session
    await expect(page.locator('text=Last login:')).toBeVisible();

    // Logout from all devices
    await page.click('button:has-text("Logout from all devices")');
    await expect(page.locator('text=Logged out from all devices')).toBeVisible();

    // Create new session in another context
    const newContext = await context.browser().newContext();
    const newPage = await newContext.newPage();
    
    await newPage.goto('/auth/login');
    await newPage.fill('input[name="email"]', 'test@xarastore.com');
    await newPage.fill('input[name="password"]', 'Test123!@#');
    await newPage.click('button[type="submit"]');
    await newPage.waitForURL('/');

    // Verify both sessions work
    await page.reload();
    await expect(page.locator('text=My Account')).toBeVisible();
    
    await newPage.goto('/account');
    await expect(newPage.locator('text=My Account')).toBeVisible();
  });
});
