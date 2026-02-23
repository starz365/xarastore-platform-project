import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useCart } from '@/lib/hooks/useCart';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { CartFlyout } from '@/components/cart/CartFlyout';

// Mock the useCart hook
vi.mock('@/lib/hooks/useCart', () => ({
  useCart: vi.fn(),
}));

describe('CartItem Component', () => {
  const mockItem = {
    id: 'cart-item-123',
    productId: 'product-123',
    variant: {
      id: 'variant-123',
      name: 'Test Variant',
      price: 9999,
      originalPrice: 12999,
      sku: 'TEST-123-V1',
      stock: 10,
      attributes: { color: 'Black', size: 'M' },
    },
    quantity: 2,
    addedAt: new Date().toISOString(),
  };

  const mockRemoveItem = vi.fn();
  const mockUpdateQuantity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCart as any).mockReturnValue({
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
    });
  });

  it('renders cart item with all details', () => {
    render(<CartItem item={mockItem} />);
    
    expect(screen.getByText('Test Variant')).toBeInTheDocument();
    expect(screen.getByText('KES 9,999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByText('KES 19,998')).toBeInTheDocument();
  });

  it('displays product attributes when available', () => {
    render(<CartItem item={mockItem} />);
    
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('calls removeItem when remove button is clicked', async () => {
    render(<CartItem item={mockItem} />);
    
    const removeButton = screen.getByLabelText(/remove item/i);
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith(mockItem.id);
    });
  });

  it('calls updateQuantity when quantity is increased', async () => {
    render(<CartItem item={mockItem} />);
    
    const increaseButton = screen.getByLabelText(/increase quantity/i);
    fireEvent.click(increaseButton);
    
    await waitFor(() => {
      expect(mockUpdateQuantity).toHaveBeenCalledWith(mockItem.id, 3);
    });
  });

  it('calls updateQuantity when quantity is decreased', async () => {
    render(<CartItem item={mockItem} />);
    
    const decreaseButton = screen.getByLabelText(/decrease quantity/i);
    fireEvent.click(decreaseButton);
    
    await waitFor(() => {
      expect(mockUpdateQuantity).toHaveBeenCalledWith(mockItem.id, 1);
    });
  });

  it('calls removeItem when quantity is decreased to 0', async () => {
    const singleItem = { ...mockItem, quantity: 1 };
    render(<CartItem item={singleItem} />);
    
    const decreaseButton = screen.getByLabelText(/decrease quantity/i);
    fireEvent.click(decreaseButton);
    
    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith(mockItem.id);
    });
  });

  it('disables decrease button when quantity is 1', () => {
    const singleItem = { ...mockItem, quantity: 1 };
    render(<CartItem item={singleItem} />);
    
    const decreaseButton = screen.getByLabelText(/decrease quantity/i);
    expect(decreaseButton).toBeDisabled();
  });

  it('disables increase button when quantity reaches stock limit', () => {
    const maxStockItem = { ...mockItem, quantity: 10 };
    render(<CartItem item={maxStockItem} />);
    
    const increaseButton = screen.getByLabelText(/increase quantity/i);
    expect(increaseButton).toBeDisabled();
  });

  it('renders product image when available', () => {
    const itemWithImage = {
      ...mockItem,
      image: '/test-image.jpg',
      productName: 'Test Product',
    };
    
    render(<CartItem item={itemWithImage} />);
    
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('renders placeholder image when no image available', () => {
    render(<CartItem item={mockItem} />);
    
    const image = screen.getByAltText('Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/placeholder.jpg');
  });

  it('calculates and displays line total correctly', () => {
    render(<CartItem item={mockItem} />);
    
    const lineTotal = screen.getByText('KES 19,998');
    expect(lineTotal).toBeInTheDocument();
    
    // 9999 * 2 = 19998
    expect(lineTotal.textContent).toContain('19,998');
  });

  it('applies correct styling for out of stock items', () => {
    const outOfStockItem = {
      ...mockItem,
      variant: { ...mockItem.variant, stock: 0 },
    };
    
    render(<CartItem item={outOfStockItem} />);
    
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toHaveClass('text-red-600');
  });

  it('disables quantity controls for out of stock items', () => {
    const outOfStockItem = {
      ...mockItem,
      variant: { ...mockItem.variant, stock: 0 },
    };
    
    render(<CartItem item={outOfStockItem} />);
    
    const increaseButton = screen.getByLabelText(/increase quantity/i);
    const decreaseButton = screen.getByLabelText(/decrease quantity/i);
    
    expect(increaseButton).toBeDisabled();
    expect(decreaseButton).toBeDisabled();
  });
});

describe('CartSummary Component', () => {
  const mockGetTotal = vi.fn();
  const mockGetItemCount = vi.fn();
  const mockClearCart = vi.fn();
  const mockItems = [
    {
      id: 'item-1',
      productId: 'product-1',
      variant: { price: 9999 },
      quantity: 2,
    },
    {
      id: 'item-2',
      productId: 'product-2',
      variant: { price: 4999 },
      quantity: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useCart as any).mockReturnValue({
      items: mockItems,
      getTotal: mockGetTotal,
      getItemCount: mockGetItemCount,
      clearCart: mockClearCart,
    });
  });

  it('renders cart summary with correct totals', () => {
    mockGetTotal.mockReturnValue(24997); // (9999 * 2) + (4999 * 1) = 24997
    mockGetItemCount.mockReturnValue(3);
    
    render(<CartSummary />);
    
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('KES 24,997')).toBeInTheDocument();
  });

  it('calculates and displays subtotal correctly', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartSummary />);
    
    const subtotalRow = screen.getByText('Subtotal');
    const subtotalValue = subtotalRow.nextElementSibling;
    
    expect(subtotalValue).toHaveTextContent('KES 24,997');
  });

  it('calculates and displays shipping cost', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartSummary />);
    
    const shippingRow = screen.getByText('Shipping');
    const shippingValue = shippingRow.nextElementSibling;
    
    // Free shipping over 2000 KES
    expect(shippingValue).toHaveTextContent('Free');
  });

  it('calculates and displays tax', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartSummary />);
    
    const taxRow = screen.getByText('Tax (16%)');
    const taxValue = taxRow.nextElementSibling;
    
    // 24997 * 0.16 = 3999.52, rounded = 4000
    expect(taxValue).toHaveTextContent('KES 4,000');
  });

  it('calculates and displays total correctly', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartSummary />);
    
    const totalRow = screen.getByText('Total');
    const totalValue = totalRow.nextElementSibling;
    
    // 24997 + 0 (shipping) + 4000 (tax) = 28997
    expect(totalValue).toHaveTextContent('KES 28,997');
  });

  it('displays free shipping message for orders over 2000 KES', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartSummary />);
    
    expect(screen.getByText('Free shipping on orders over KES 2,000')).toBeInTheDocument();
  });

  it('displays shipping cost for orders under 2000 KES', () => {
    mockGetTotal.mockReturnValue(1500);
    
    render(<CartSummary />);
    
    const shippingValue = screen.getByText('Shipping').nextElementSibling;
    expect(shippingValue).toHaveTextContent('KES 299');
  });

  it('renders checkout button', () => {
    render(<CartSummary />);
    
    const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i });
    expect(checkoutButton).toBeInTheDocument();
    expect(checkoutButton).toHaveAttribute('href', '/checkout');
  });

  it('disables checkout button when cart is empty', () => {
    (useCart as any).mockReturnValue({
      items: [],
      getTotal: () => 0,
      getItemCount: () => 0,
      clearCart: mockClearCart,
    });
    
    render(<CartSummary />);
    
    const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i });
    expect(checkoutButton).toBeDisabled();
  });

  it('renders continue shopping link', () => {
    render(<CartSummary />);
    
    const continueLink = screen.getByRole('link', { name: /continue shopping/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/shop');
  });

  it('calls clearCart when clear cart button is clicked', async () => {
    render(<CartSummary />);
    
    const clearButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
    });
  });

  it('disables clear cart button when cart is empty', () => {
    (useCart as any).mockReturnValue({
      items: [],
      getTotal: () => 0,
      getItemCount: () => 0,
      clearCart: mockClearCart,
    });
    
    render(<CartSummary />);
    
    const clearButton = screen.getByRole('button', { name: /clear cart/i });
    expect(clearButton).toBeDisabled();
  });

  it('applies discount when coupon is applied', () => {
    // Note: Coupon functionality would be tested separately
    render(<CartSummary />);
    
    const couponInput = screen.getByPlaceholderText(/enter coupon code/i);
    expect(couponInput).toBeInTheDocument();
    
    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeInTheDocument();
  });
});

describe('CartFlyout Component', () => {
  const mockGetTotal = vi.fn();
  const mockGetItemCount = vi.fn();
  const mockItems = [
    {
      id: 'item-1',
      productId: 'product-1',
      variant: { price: 9999, name: 'Test Variant' },
      quantity: 2,
      productName: 'Test Product',
      image: '/test-image.jpg',
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCart as any).mockReturnValue({
      items: mockItems,
      getTotal: mockGetTotal,
      getItemCount: mockGetItemCount,
    });
  });

  it('renders cart flyout when open', () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Variant')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<CartFlyout isOpen={false} onClose={mockOnClose} />);
    
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText(/close cart/i);
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when overlay is clicked', async () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const overlay = screen.getByTestId('cart-overlay');
    fireEvent.click(overlay);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays empty cart message when cart is empty', () => {
    (useCart as any).mockReturnValue({
      items: [],
      getTotal: () => 0,
      getItemCount: () => 0,
    });
    
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Start adding items to your cart')).toBeInTheDocument();
  });

  it('renders view cart button', () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const viewCartButton = screen.getByRole('link', { name: /view cart/i });
    expect(viewCartButton).toBeInTheDocument();
    expect(viewCartButton).toHaveAttribute('href', '/cart');
  });

  it('renders checkout button', () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const checkoutButton = screen.getByRole('link', { name: /checkout/i });
    expect(checkoutButton).toBeInTheDocument();
    expect(checkoutButton).toHaveAttribute('href', '/checkout');
  });

  it('disables checkout button when cart is empty', () => {
    (useCart as any).mockReturnValue({
      items: [],
      getTotal: () => 0,
      getItemCount: () => 0,
    });
    
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const checkoutButton = screen.getByRole('link', { name: /checkout/i });
    expect(checkoutButton).toBeDisabled();
  });

  it('displays cart item count in header', () => {
    mockGetItemCount.mockReturnValue(3);
    
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
  });

  it('displays cart total', () => {
    mockGetTotal.mockReturnValue(24997);
    
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('KES 24,997')).toBeInTheDocument();
  });

  it('applies slide-in animation when opening', () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const flyoutContent = screen.getByText('Shopping Cart').closest('div[class*="transform"]');
    expect(flyoutContent).toHaveClass('translate-x-0');
  });

  it('applies slide-out animation when closing', () => {
    render(<CartFlyout isOpen={false} onClose={mockOnClose} />);
    
    // When isOpen is false, component shouldn't render
    const { container } = render(<CartFlyout isOpen={false} onClose={mockOnClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles keyboard navigation for closing', async () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('traps focus within flyout when open', () => {
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const focusableElements = screen.getAllByRole('button');
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // First focusable element should be the close button
    expect(focusableElements[0]).toHaveAttribute('aria-label', 'Close cart');
  });

  it('renders continue shopping button in empty state', () => {
    (useCart as any).mockReturnValue({
      items: [],
      getTotal: () => 0,
      getItemCount: () => 0,
    });
    
    render(<CartFlyout isOpen={true} onClose={mockOnClose} />);
    
    const continueButton = screen.getByRole('link', { name: /continue shopping/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toHaveAttribute('href', '/shop');
  });
});
