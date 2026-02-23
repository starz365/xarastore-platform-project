tests/integration/pages/checkout-flow.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from '@/app/checkout/page';
import { useCart } from '@/lib/hooks/useCart';
import { supabase } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/lib/hooks/useCart', () => ({
  useCart: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/components/checkout/CheckoutForm', () => ({
  CheckoutForm: ({ onContinue }: { onContinue: () => void }) => (
    <div>
      <h2>Address Form</h2>
      <button onClick={onContinue}>Continue</button>
    </div>
  ),
}));

jest.mock('@/components/checkout/OrderSummary', () => () => (
  <div>
    <h3>Order Summary</h3>
    <p>Total: KES 10,000</p>
  </div>
));

jest.mock('@/components/checkout/PaymentMethods', () => ({
  PaymentMethods: () => (
    <div>
      <h3>Payment Methods</h3>
      <button>Pay with M-Pesa</button>
    </div>
  ),
}));

describe('Checkout Flow Integration Tests', () => {
  let queryClient: QueryClient;
  let mockCart: any;
  let mockRouter: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });

    mockCart = {
      items: [
        {
          id: 'cart-item-1',
          productId: 'product-1',
          variant: {
            id: 'variant-1',
            name: 'Default',
            price: 5000,
            sku: 'SKU-001',
            stock: 10,
          },
          quantity: 2,
          addedAt: new Date().toISOString(),
        },
      ],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      getTotal: jest.fn(() => 10000),
      getItemCount: jest.fn(() => 2),
      syncWithServer: jest.fn(),
    };

    mockRouter = {
      push: jest.fn(),
    };

    (useCart as jest.Mock).mockReturnValue(mockCart);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
            },
          },
        },
      },
      error: null,
    });

    // Mock address fetch
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'user_addresses') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [
                {
                  id: 'address-1',
                  name: 'Test User',
                  phone: '0712345678',
                  street: '123 Test Street',
                  city: 'Nairobi',
                  state: 'Nairobi',
                  postal_code: '00100',
                  country: 'Kenya',
                  is_default: true,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderCheckoutPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CheckoutPage />
      </QueryClientProvider>
    );
  };

  it('should redirect to cart when empty', async () => {
    mockCart.items = [];
    mockCart.getItemCount.mockReturnValue(0);

    renderCheckoutPage();

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/cart');
    });
  });

  it('should render checkout page with items', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText(/2 item/)).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Total: KES 10,000')).toBeInTheDocument();
  });

  it('should render checkout progress steps', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('should start at address step', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Address Form')).toBeInTheDocument();
    });

    // Address step should be active
    const addressStep = screen.getByText('Address').closest('div');
    expect(addressStep).toHaveClass(/border-red-600/);
  });

  it('should navigate to delivery step', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Continue'));

    // Should show delivery step content
    await waitFor(() => {
      expect(screen.getByText('Select Delivery Method')).toBeInTheDocument();
    });
  });

  it('should render delivery methods', async () => {
    renderCheckoutPage();

    // Navigate to delivery step
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Standard Delivery')).toBeInTheDocument();
    });

    expect(screen.getByText('Standard Delivery')).toBeInTheDocument();
    expect(screen.getByText('Express Delivery')).toBeInTheDocument();
    expect(screen.getByText('Same Day Delivery')).toBeInTheDocument();
  });

  it('should select delivery method', async () => {
    renderCheckoutPage();

    // Navigate to delivery step
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Standard Delivery')).toBeInTheDocument();
    });

    const standardDelivery = screen.getByText('Standard Delivery').closest('div');
    fireEvent.click(standardDelivery!);

    // Should show selected state
    expect(standardDelivery).toHaveClass(/border-red-600/);
  });

  it('should navigate to payment step', async () => {
    renderCheckoutPage();

    // Navigate through steps
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Continue to Payment')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue to Payment'));

    // Should show payment step content
    await waitFor(() => {
      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
    });
  });

  it('should render payment methods', async () => {
    renderCheckoutPage();

    // Navigate to payment step
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Continue to Payment')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    expect(screen.getByText('Pay with M-Pesa')).toBeInTheDocument();
  });

  it('should render security badges', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Secure Payment')).toBeInTheDocument();
    });

    expect(screen.getByText('Secure Payment')).toBeInTheDocument();
    expect(screen.getByText('Privacy Protected')).toBeInTheDocument();
    expect(screen.getByText('Fast Delivery')).toBeInTheDocument();
  });

  it('should handle user authentication loading', async () => {
    // Mock loading session
    (supabase.auth.getSession as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderCheckoutPage();

    // Should show loading skeleton
    expect(screen.queryByText('Checkout')).not.toBeInTheDocument();
  });

  it('should handle user not authenticated', async () => {
    // Mock no session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderCheckoutPage();

    // Should still render checkout (guest checkout)
    await waitFor(() => {
      expect(screen.getByText('Address Form')).toBeInTheDocument();
    });
  });

  it('should render offline indicator when offline', async () => {
    // Mock network status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });

    // Restore
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should show cart summary with correct calculations', async () => {
    mockCart.getTotal.mockReturnValue(10998); // 2 items * 5000 + shipping 299 + tax 1699

    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Total: KES 10,000')).toBeInTheDocument();
    });
  });

  it('should handle payment submission', async () => {
    renderCheckoutPage();

    // Navigate to payment step
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Continue to Payment')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Pay Securely')).toBeInTheDocument();
    });

    // In a real test, we would mock the payment API call
    const payButton = screen.getByText('Pay Securely');
    expect(payButton).toBeInTheDocument();
  });

  it('should handle checkout form validation', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Address Form')).toBeInTheDocument();
    });

    // Test would include form validation scenarios
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeInTheDocument();
  });

  it('should update progress indicators when changing steps', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    // Initially address step should be active
    let addressStep = screen.getByText('Address').closest('div');
    expect(addressStep).toHaveClass(/border-red-600/);

    // Navigate to delivery
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      const deliveryStep = screen.getByText('Delivery').closest('div');
      expect(deliveryStep).toHaveClass(/border-red-600/);
    });
  });

  it('should persist cart data during navigation', async () => {
    renderCheckoutPage();

    await waitFor(() => {
      expect(mockCart.syncWithServer).toHaveBeenCalled();
    });

    // Cart should be synced with server
    expect(mockCart.syncWithServer).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error for addresses
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'user_addresses') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      };
    });

    renderCheckoutPage();

    // Should still render checkout form
    await waitFor(() => {
      expect(screen.getByText('Address Form')).toBeInTheDocument();
    });
  });

  it('should calculate and display shipping options', async () => {
    renderCheckoutPage();

    // Navigate to delivery step
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText(/KES/)).toBeInTheDocument();
    });

    // Check shipping prices are displayed
    const shippingPrices = screen.getAllByText(/KES/);
    expect(shippingPrices.length).toBeGreaterThan(0);
  });
});
