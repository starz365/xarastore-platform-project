import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';

describe('Button Component', () => {
  it('renders button with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-primary');
    expect(button).not.toBeDisabled();
  });

  it('renders button with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    
    const button = screen.getByRole('button', { name: /primary button/i });
    expect(button).toHaveClass('bg-brand-red');
    expect(button).toHaveClass('text-white');
  });

  it('renders button with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    
    const button = screen.getByRole('button', { name: /secondary button/i });
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-gray-700');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-gray-300');
  });

  it('renders button with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-gray-300');
    expect(button).toHaveClass('bg-transparent');
  });

  it('renders button with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    
    const button = screen.getByRole('button', { name: /ghost button/i });
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('hover:bg-gray-100');
  });

  it('renders button with link variant', () => {
    render(<Button variant="link">Link Button</Button>);
    
    const button = screen.getByRole('button', { name: /link button/i });
    expect(button).toHaveClass('text-brand-red');
    expect(button).toHaveClass('hover:underline');
  });

  it('renders button with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('py-2', 'px-4', 'text-sm');

    rerender(<Button size="md">Medium Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('py-2.5', 'px-6');

    rerender(<Button size="lg">Large Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('py-3', 'px-8', 'text-lg');
  });

  it('renders button with icon', () => {
    render(
      <Button>
        <ShoppingCart data-testid="icon" className="w-4 h-4" />
        Add to Cart
      </Button>
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Add to Cart');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveClass('cursor-not-allowed');
  });

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Loading Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders as anchor when href is provided', () => {
    render(
      <Button href="/cart" asChild>
        Go to Cart
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /go to cart/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/cart');
    expect(link).toHaveClass('btn-primary');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('btn-primary'); // Still has base classes
  });

  it('has correct type attribute', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');

    rerender(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('renders full width button', () => {
    render(<Button fullWidth>Full Width Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('maintains accessibility attributes', () => {
    render(
      <Button aria-label="Add item to cart" aria-describedby="description">
        Add to Cart
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Add item to cart');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('handles keyboard navigation', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Press Enter</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('renders with data-testid when provided', () => {
    render(<Button data-testid="test-button">Test Button</Button>);
    
    expect(screen.getByTestId('test-button')).toBeInTheDocument();
    expect(screen.getByTestId('test-button')).toHaveTextContent('Test Button');
  });

  it('has proper focus styles for accessibility', () => {
    render(<Button>Focusable Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-brand-red');
    expect(button).toHaveClass('focus:ring-offset-2');
    expect(button).toHaveClass('outline-none');
  });
});
