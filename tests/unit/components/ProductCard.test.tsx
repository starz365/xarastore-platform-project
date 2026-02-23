import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard } from '@/components/product/ProductCard';
import { Product } from '@/types';
import { useCart } from '@/lib/hooks/useCart';

// Mock the useCart hook
vi.mock('@/lib/hooks/useCart', () => ({
  useCart: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProductCard Component', () => {
  const mockProduct: Product = {
    id: 'test-product-123',
    slug: 'test-product',
    name: 'Test Product',
    description: 'A test product description',
    price: 9999,
    originalPrice: 12999,
    sku: 'TEST-123',
    brand: {
      id: 'test-brand-123',
      slug: 'test-brand',
      name: 'Test Brand',
      logo: '/logo.png',
      productCount: 10,
    },
    category: {
      id: 'test-category-123',
      slug: 'test-category',
      name: 'Test Category',
      productCount: 50,
    },
    images: ['/test-image.jpg', '/test-image-2.jpg'],
    variants: [
      {
        id: 'variant-123',
        name: 'Default Variant',
        price: 9999,
        originalPrice: 12999,
        sku: 'TEST-123-V1',
        stock: 10,
        attributes: { color: 'Black', size: 'M' },
      },
    ],
    specifications: { material: 'Cotton', weight: '300g' },
    rating: 4.5,
    reviewCount: 24,
    stock: 10,
    isFeatured: true,
    isDeal: true,
    dealEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAddItem = vi.fn();
  const mockItems: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    (useCart as any).mockReturnValue({
      addItem: mockAddItem,
      items: mockItems,
    });
  });

  it('renders product card with all details', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.brand.name)).toBeInTheDocument();
    expect(screen.getByText('KES 9,999')).toBeInTheDocument();
    expect(screen.getByText('KES 12,999')).toBeInTheDocument();
    expect(screen.getByText('-23%')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByText('(24)')).toBeInTheDocument();
  });

  it('renders product image with correct attributes', () => {
    render(<ProductCard product={mockProduct} />);
    
    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockProduct.images[0]);
  });

  it('renders wishlist button', () => {
    render(<ProductCard product={mockProduct} />);
    
    const wishlistButton = screen.getByLabelText(/add to wishlist/i);
    expect(wishlistButton).toBeInTheDocument();
  });

  it('toggles wishlist state when clicked', async () => {
    render(<ProductCard product={mockProduct} />);
    
    const wishlistButton = screen.getByLabelText(/add to wishlist/i);
    fireEvent.click(wishlistButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/remove from wishlist/i)).toBeInTheDocument();
    });
    
    fireEvent.click(wishlistButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/add to wishlist/i)).toBeInTheDocument();
    });
  });

  it('renders add to cart button', () => {
    render(<ProductCard product={mockProduct} />);
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeInTheDocument();
    expect(addToCartButton).toBeEnabled();
  });

  it('calls addItem when add to cart button is clicked', async () => {
    render(<ProductCard product={mockProduct} />);
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);
    
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith(
        mockProduct.id,
        mockProduct.variants[0],
        1
      );
    });
  });

  it('disables add to cart button when out of stock', () => {
    const outOfStockProduct = {
      ...mockProduct,
      stock: 0,
      variants: [{ ...mockProduct.variants[0], stock: 0 }],
    };
    
    render(<ProductCard product={outOfStockProduct} />);
    
    const addToCartButton = screen.getByRole('button', { name: /out of stock/i });
    expect(addToCartButton).toBeDisabled();
    expect(addToCartButton).toHaveTextContent('Out of stock');
  });

  it('renders view details button', () => {
    render(<ProductCard product={mockProduct} />);
    
    const viewButton = screen.getByLabelText(/view product details/i);
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveAttribute('href', `/product/${mockProduct.slug}`);
  });

  it('renders discount badge when product has discount', () => {
    render(<ProductCard product={mockProduct} />);
    
    const discountBadge = screen.getByText('-23%');
    expect(discountBadge).toBeInTheDocument();
    expect(discountBadge).toHaveClass('bg-brand-red');
    expect(discountBadge).toHaveClass('text-white');
  });

  it('does not render discount badge when no original price', () => {
    const productWithoutDiscount = {
      ...mockProduct,
      originalPrice: undefined,
    };
    
    render(<ProductCard product={productWithoutDiscount} />);
    
    const discountBadge = screen.queryByText(/-/);
    expect(discountBadge).not.toBeInTheDocument();
  });

  it('renders low stock indicator', () => {
    const lowStockProduct = {
      ...mockProduct,
      stock: 3,
      variants: [{ ...mockProduct.variants[0], stock: 3 }],
    };
    
    render(<ProductCard product={lowStockProduct} />);
    
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    expect(screen.getByText('Only 3 left')).toHaveClass('text-orange-600');
  });

  it('renders rating stars', () => {
    render(<ProductCard product={mockProduct} />);
    
    const ratingContainer = screen.getByLabelText(`Rating: ${mockProduct.rating} out of 5 stars`);
    expect(ratingContainer).toBeInTheDocument();
    
    // Should have 5 stars total
    const stars = ratingContainer.querySelectorAll('svg');
    expect(stars.length).toBe(5);
  });

  it('renders brand link correctly', () => {
    render(<ProductCard product={mockProduct} />);
    
    const brandLink = screen.getByText(mockProduct.brand.name);
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', `/brands/${mockProduct.brand.slug}`);
  });

  it('renders product name link correctly', () => {
    render(<ProductCard product={mockProduct} />);
    
    const productLink = screen.getByText(mockProduct.name).closest('a');
    expect(productLink).toHaveAttribute('href', `/product/${mockProduct.slug}`);
  });

  it('shows timer for deals when showTimer prop is true', () => {
    render(<ProductCard product={mockProduct} showTimer />);
    
    expect(screen.getByText(/ends in/i)).toBeInTheDocument();
    expect(screen.getByText(/days/i)).toBeInTheDocument();
    expect(screen.getByText(/hours/i)).toBeInTheDocument();
    expect(screen.getByText(/min/i)).toBeInTheDocument();
    expect(screen.getByText(/sec/i)).toBeInTheDocument();
  });

  it('does not show timer when showTimer prop is false', () => {
    render(<ProductCard product={mockProduct} showTimer={false} />);
    
    expect(screen.queryByText(/ends in/i)).not.toBeInTheDocument();
  });

  it('shows already in cart state when product is in cart', () => {
    (useCart as any).mockReturnValue({
      addItem: mockAddItem,
      items: [{
        productId: mockProduct.id,
        variant: mockProduct.variants[0],
      }],
    });
    
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Already in Cart')).toBeInTheDocument();
  });

  it('handles image hover effect', () => {
    render(<ProductCard product={mockProduct} />);
    
    const imageContainer = screen.getByAltText(mockProduct.name).parentElement;
    expect(imageContainer).toHaveClass('group');
    
    // The image should have hover scale transform class
    const image = screen.getByAltText(mockProduct.name);
    expect(image).toHaveClass('group-hover:scale-105');
  });

  it('applies correct styling for card hover', () => {
    render(<ProductCard product={mockProduct} />);
    
    const card = screen.getByText(mockProduct.name).closest('div[class*="group"]');
    expect(card).toHaveClass('hover:border-brand-red');
    expect(card).toHaveClass('hover:shadow-card-hover');
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-200');
  });

  it('renders with correct ARIA labels for accessibility', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByLabelText(/add to wishlist/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/view product details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(`Rating: ${mockProduct.rating} out of 5 stars`)).toBeInTheDocument();
  });

  it('handles product with multiple variants correctly', () => {
    const multiVariantProduct = {
      ...mockProduct,
      variants: [
        { ...mockProduct.variants[0], id: 'v1', name: 'Black' },
        { ...mockProduct.variants[0], id: 'v2', name: 'White', price: 10999 },
      ],
    };
    
    render(<ProductCard product={multiVariantProduct} />);
    
    // Should still render correctly with multiple variants
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText('KES 9,999')).toBeInTheDocument();
  });

  it('renders correctly without optional fields', () => {
    const minimalProduct = {
      ...mockProduct,
      originalPrice: undefined,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      isDeal: false,
      dealEndsAt: undefined,
    };
    
    render(<ProductCard product={minimalProduct} />);
    
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.queryByText(/-/)).not.toBeInTheDocument(); // No discount badge
    expect(screen.queryByText(/\(0\)/)).toBeInTheDocument(); // Zero reviews
  });
});
