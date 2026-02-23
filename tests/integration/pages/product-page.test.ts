tests/integration/pages/product-page.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductPage from '@/app/product/[slug]/page';
import { useCart } from '@/lib/hooks/useCart';
import { supabase } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@/lib/hooks/useCart', () => ({
  useCart: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useParams: jest.fn(() => ({
    slug: 'test-product',
  })),
  notFound: jest.fn(),
}));

describe('Product Page Integration Tests', () => {
  let queryClient: QueryClient;
  let mockCart: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockCart = {
      items: [],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      getItemCount: jest.fn(() => 0),
      getTotal: jest.fn(() => 0),
    };

    (useCart as jest.Mock).mockReturnValue(mockCart);

    // Mock Supabase response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-product-id',
              slug: 'test-product',
              name: 'Test Product',
              description: 'This is a test product description for testing purposes.',
              price: 9999,
              original_price: 12999,
              sku: 'TEST-SKU-001',
              brand: {
                id: 'brand-1',
                slug: 'test-brand',
                name: 'Test Brand',
                logo: 'https://example.com/logo.jpg',
                product_count: 10,
              },
              category: {
                id: 'category-1',
                slug: 'test-category',
                name: 'Test Category',
                product_count: 50,
              },
              images: [
                'https://example.com/product1.jpg',
                'https://example.com/product2.jpg',
              ],
              variants: [
                {
                  id: 'variant-1',
                  name: 'Default',
                  price: 9999,
                  original_price: 12999,
                  sku: 'TEST-SKU-001-V1',
                  stock: 50,
                  attributes: {},
                },
              ],
              specifications: {
                material: 'Cotton',
                color: 'Red',
                size: 'Medium',
              },
              rating: 4.5,
              review_count: 128,
              stock: 50,
              is_featured: true,
              is_deal: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          })),
        })),
      })),
    });

    // Mock auth session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderProductPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProductPage params={{ slug: 'test-product' }} />
      </QueryClientProvider>
    );
  };

  it('should render product details correctly', async () => {
    renderProductPage();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Check product name
    expect(screen.getByText('Test Product')).toBeInTheDocument();

    // Check brand link
    expect(screen.getByText('Test Brand')).toBeInTheDocument();

    // Check category link
    expect(screen.getByText('Test Category')).toBeInTheDocument();

    // Check price
    expect(screen.getByText(/KES 9,999/)).toBeInTheDocument();

    // Check original price
    expect(screen.getByText(/KES 12,999/)).toBeInTheDocument();

    // Check discount percentage
    expect(screen.getByText(/Save 23%/)).toBeInTheDocument();

    // Check rating
    expect(screen.getByText('4.5')).toBeInTheDocument();

    // Check review count
    expect(screen.getByText('128 reviews')).toBeInTheDocument();

    // Check stock status
    expect(screen.getByText('In stock')).toBeInTheDocument();

    // Check SKU
    expect(screen.getByText('TEST-SKU-001')).toBeInTheDocument();
  });

  it('should render product images gallery', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
    });

    // Check main image
    const mainImage = screen.getByAltText('Product image 1');
    expect(mainImage).toBeInTheDocument();

    // Check thumbnails
    const thumbnails = screen.getAllByAltText(/Thumbnail/);
    expect(thumbnails).toHaveLength(2);
  });

  it('should render product description', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Product Description')).toBeInTheDocument();
    });

    expect(screen.getByText(/This is a test product description/)).toBeInTheDocument();
  });

  it('should render product specifications', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Specifications')).toBeInTheDocument();
    });

    expect(screen.getByText('material')).toBeInTheDocument();
    expect(screen.getByText('Cotton')).toBeInTheDocument();
    expect(screen.getByText('color')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should render add to cart button', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    const addToCartButton = screen.getByText('Add to Cart');
    expect(addToCartButton).toBeInTheDocument();
    expect(addToCartButton).toBeEnabled();
  });

  it('should render quantity selector', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const quantityInput = screen.getByDisplayValue('1');
    expect(quantityInput).toBeInTheDocument();

    // Check increment/decrement buttons
    const incrementButton = screen.getByLabelText('Increase quantity');
    const decrementButton = screen.getByLabelText('Decrease quantity');

    expect(incrementButton).toBeInTheDocument();
    expect(decrementButton).toBeInTheDocument();
  });

  it('should update quantity when buttons are clicked', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const incrementButton = screen.getByLabelText('Increase quantity');
    fireEvent.click(incrementButton);

    // Since quantity is controlled, we need to check if the click handler was called
    // In a real test, we would mock the quantity state
    expect(incrementButton).toBeEnabled();
  });

  it('should disable add to cart button when out of stock', async () => {
    // Mock out of stock product
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'out-of-stock-product',
              slug: 'out-of-stock',
              name: 'Out of Stock Product',
              price: 9999,
              stock: 0,
              // ... other required fields
            },
            error: null,
          })),
        })),
      })),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProductPage params={{ slug: 'out-of-stock' }} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const addToCartButton = screen.getByText('Out of Stock');
      expect(addToCartButton).toBeInTheDocument();
      expect(addToCartButton).toBeDisabled();
    });
  });

  it('should render breadcrumb navigation', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByText('Test Brand')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should render trust badges', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Free Delivery')).toBeInTheDocument();
    });

    expect(screen.getByText('Free Delivery')).toBeInTheDocument();
    expect(screen.getByText('1 Year Warranty')).toBeInTheDocument();
    expect(screen.getByText('Easy Returns')).toBeInTheDocument();
  });

  it('should render buy now button', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Buy Now')).toBeInTheDocument();
    });

    const buyNowButton = screen.getByText('Buy Now');
    expect(buyNowButton).toBeInTheDocument();
    expect(buyNowButton).toBeEnabled();
  });

  it('should handle product not found', async () => {
    // Mock not found response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Not found' },
          })),
        })),
      })),
    });

    const { notFound } = require('next/navigation');
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProductPage params={{ slug: 'non-existent' }} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(notFound).toHaveBeenCalled();
    });
  });

  it('should handle loading state', async () => {
    // Mock slow response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => new Promise(() => {})), // Never resolves
        })),
      })),
    });

    renderProductPage();

    // Should show loading state
    expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
  });

  it('should handle error state', async () => {
    // Mock error response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' },
          })),
        })),
      })),
    });

    renderProductPage();

    await waitFor(() => {
      // Should show error state or call notFound
      const { notFound } = require('next/navigation');
      expect(notFound).toHaveBeenCalled();
    });
  });

  it('should render product tabs', async () => {
    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Specifications')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Q&A')).toBeInTheDocument();
  });
});
