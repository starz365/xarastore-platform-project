'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/css';
import Link from 'next/link';

interface NavigationMenuItem {
  title: string;
  href?: string;
  description?: string;
  icon?: ReactNode;
  items?: NavigationMenuItem[];
  featured?: boolean;
  new?: boolean;
  external?: boolean;
}

interface NavigationMenuProps {
  items: NavigationMenuItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  delayDuration?: number;
  onItemSelect?: (item: NavigationMenuItem) => void;
}

export function NavigationMenu({
  items,
  className,
  orientation = 'horizontal',
  delayDuration = 200,
  onItemSelect,
}: NavigationMenuProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (itemTitle: string, event: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setCoords({
      x: rect.left,
      y: rect.bottom,
    });
    
    timeoutRef.current = setTimeout(() => {
      setActiveItem(itemTitle);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveItem(null);
    }, delayDuration);
  };

  const handleItemClick = (item: NavigationMenuItem) => {
    setActiveItem(null);
    onItemSelect?.(item);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveItem(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const findActiveItem = (): NavigationMenuItem | undefined => {
    return items.find(item => item.title === activeItem);
  };

  const activeItemData = findActiveItem();

  return (
    <div
      ref={menuRef}
      className={cn('relative', className)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Menu Items */}
      <nav className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1'
      )}>
        {items.map((item) => {
          const hasItems = item.items && item.items.length > 0;
          const isActive = activeItem === item.title;

          return (
            <div
              key={item.title}
              className="relative"
              onMouseEnter={(e) => handleMouseEnter(item.title, e)}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'hover:bg-gray-100 hover:text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
                    isActive ? 'text-red-700 bg-red-50' : 'text-gray-700'
                  )}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                >
                  {item.title}
                  {hasItems && <ChevronDown className="ml-1 w-4 h-4" />}
                  {item.new && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      New
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => hasItems ? setActiveItem(item.title) : handleItemClick(item)}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'hover:bg-gray-100 hover:text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
                    isActive ? 'text-red-700 bg-red-50' : 'text-gray-700'
                  )}
                  aria-expanded={isActive}
                  aria-haspopup={hasItems ? 'menu' : undefined}
                >
                  {item.title}
                  {hasItems && <ChevronDown className="ml-1 w-4 h-4" />}
                  {item.new && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      New
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Dropdown Content */}
      {activeItemData?.items && activeItemData.items.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-fade-in"
          style={{
            left: `${coords.x}px`,
            minWidth: '320px',
          }}
          onMouseEnter={() => setActiveItem(activeItemData.title)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-4">
            {activeItemData.featured && (
              <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-1">{activeItemData.title}</h3>
                <p className="text-sm text-red-700">{activeItemData.description}</p>
              </div>
            )}

            <div className="grid gap-2">
              {activeItemData.items.map((subItem) => (
                <Link
                  key={subItem.title}
                  href={subItem.href || '#'}
                  onClick={() => handleItemClick(subItem)}
                  className={cn(
                    'flex items-start p-3 rounded-lg transition-colors',
                    'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-600'
                  )}
                  target={subItem.external ? '_blank' : undefined}
                  rel={subItem.external ? 'noopener noreferrer' : undefined}
                >
                  {subItem.icon && (
                    <div className="mr-3 mt-0.5 text-red-600">
                      {subItem.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{subItem.title}</span>
                      {subItem.new && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    {subItem.description && (
                      <p className="text-sm text-gray-500 mt-1">{subItem.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Navigation Menu Item component
interface NavigationMenuItemProps {
  children: ReactNode;
  className?: string;
}

export function NavigationMenuItem({ children, className }: NavigationMenuItemProps) {
  return (
    <li className={cn('', className)}>
      {children}
    </li>
  );
}

// Navigation Menu Link component
interface NavigationMenuLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function NavigationMenuLink({
  href,
  children,
  active = false,
  className,
}: NavigationMenuLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center px-3 py-2 text-sm font-medium transition-colors',
        'hover:text-red-700 focus:outline-none focus:text-red-700',
        active ? 'text-red-700' : 'text-gray-700',
        className
      )}
    >
      {children}
    </Link>
  );
}

// Compound components
NavigationMenu.Item = NavigationMenuItem;
NavigationMenu.Link = NavigationMenuLink;
