'use client';

import { useState, useEffect, useRef, cloneElement, ReactElement, ReactNode } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface ContextMenuItem {
  label: string;
  action?: () => void;
  icon?: ReactElement;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  shortcut?: string;
  checked?: boolean;
}

interface ContextMenuProps {
  trigger: ReactElement;
  items: ContextMenuItem[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  contentClassName?: string;
  itemClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenu({
  trigger,
  items,
  align = 'start',
  side = 'bottom',
  className,
  contentClassName,
  itemClassName,
  onOpenChange,
}: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout>();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const x = e.clientX;
    const y = e.clientY;
    setCoords({ x, y });
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveSubmenu(null);
    onOpenChange?.(false);
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.separator) return;
    
    if (item.action) {
      item.action();
      handleClose();
    }
  };

  const handleSubmenuEnter = (itemLabel: string) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveSubmenu(itemLabel);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, [open]);

  // Position menu
  useEffect(() => {
    if (!open || !menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = coords.x;
    let top = coords.y;

    // Adjust based on side and align
    switch (side) {
      case 'top':
        top -= menuRect.height;
        break;
      case 'bottom':
        // Already positioned at click
        break;
      case 'left':
        left -= menuRect.width;
        break;
      case 'right':
        // Already positioned at click
        break;
    }

    switch (align) {
      case 'center':
        left -= menuRect.width / 2;
        break;
      case 'end':
        left -= menuRect.width;
        break;
    }

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + menuRect.width > viewportWidth - 8) {
      left = viewportWidth - menuRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + menuRect.height > viewportHeight - 8) {
      top = viewportHeight - menuRect.height - 8;
    }

    menuRef.current.style.left = `${left}px`;
    menuRef.current.style.top = `${top}px`;
  }, [open, coords, side, align]);

  const renderMenuItems = (menuItems: ContextMenuItem[], level = 0) => {
    return menuItems.map((item, index) => {
      if (item.separator) {
        return (
          <div
            key={`separator-${index}-${level}`}
            className="my-1 border-t border-gray-200"
            role="separator"
          />
        );
      }

      const hasSubmenu = item.submenu && item.submenu.length > 0;
      const isSubmenuActive = activeSubmenu === item.label;

      return (
        <div
          key={`${item.label}-${index}-${level}`}
          className="relative"
          onMouseEnter={() => hasSubmenu && handleSubmenuEnter(item.label)}
          onMouseLeave={hasSubmenu ? handleSubmenuLeave : undefined}
        >
          <button
            type="button"
            onClick={() => !hasSubmenu && handleItemClick(item)}
            disabled={item.disabled}
            className={cn(
              'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
              'focus:outline-none focus:bg-gray-100 rounded',
              item.disabled && 'opacity-50 cursor-not-allowed',
              item.destructive
                ? 'text-red-600 hover:bg-red-50 focus:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100',
              itemClassName
            )}
            role="menuitem"
          >
            <div className="flex items-center space-x-2">
              {item.icon && cloneElement(item.icon, { className: 'w-4 h-4' })}
              <span>{item.label}</span>
            </div>
            <div className="flex items-center space-x-2">
              {item.checked && <Check className="w-4 h-4" />}
              {item.shortcut && (
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                  {item.shortcut}
                </kbd>
              )}
              {hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
          </button>

          {/* Submenu */}
          {hasSubmenu && isSubmenuActive && item.submenu && (
            <div
              className="absolute top-0 left-full ml-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-10"
              onMouseEnter={() => handleSubmenuEnter(item.label)}
              onMouseLeave={handleSubmenuLeave}
            >
              {renderMenuItems(item.submenu, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={triggerRef}
      className={cn('inline-block', className)}
      onContextMenu={handleContextMenu}
    >
      {cloneElement(trigger, {
        onContextMenu: handleContextMenu,
      })}

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className={cn(
              'fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[200px]',
              'animate-fade-in',
              contentClassName
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {renderMenuItems(items)}
          </div>
        </>
      )}
    </div>
  );
}
