'use client';

import { useState, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface MenuItem {
  label: string;
  action?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
  shortcut?: string;
  checked?: boolean;
}

interface MenubarContextType {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
}

const MenubarContext = createContext<MenubarContextType | undefined>(undefined);

interface MenubarProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

export function Menubar({
  children,
  className,
  orientation = 'horizontal',
  onValueChange,
  defaultValue,
}: MenubarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(defaultValue || null);

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div
        className={cn(
          'flex bg-white border border-gray-200 rounded-lg',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          className
        )}
        role="menubar"
        aria-orientation={orientation}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
}

interface MenubarMenuProps {
  value: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MenubarMenu({ value, trigger, children, className }: MenubarMenuProps) {
  const context = useContext(MenubarContext);
  if (!context) throw new Error('MenubarMenu must be used within Menubar');

  const { activeMenu, setActiveMenu } = context;
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = activeMenu === value;

  const toggleMenu = () => {
    setActiveMenu(isOpen ? null : value);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={toggleMenu}
        className={cn(
          'px-4 py-2 text-sm font-medium transition-colors',
          'focus:outline-none focus:bg-gray-100 focus:text-gray-900',
          'hover:bg-gray-100 hover:text-gray-900',
          isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
          'flex items-center space-x-1'
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={`menubar-${value}`}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          id={`menubar-${value}`}
          className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MenubarContentProps {
  children: ReactNode;
  className?: string;
}

export function MenubarContent({ children, className }: MenubarContentProps) {
  return (
    <div className={cn('p-1', className)}>
      {children}
    </div>
  );
}

interface MenubarItemProps {
  children: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MenubarItem({
  children,
  disabled = false,
  destructive = false,
  onClick,
  className,
}: MenubarItemProps) {
  const context = useContext(MenubarContext);
  
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.setActiveMenu(null);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
        'focus:outline-none focus:bg-gray-100 rounded',
        disabled && 'opacity-50 cursor-not-allowed',
        destructive
          ? 'text-red-600 hover:bg-red-50 focus:bg-red-50'
          : 'text-gray-700 hover:bg-gray-100',
        className
      )}
      role="menuitem"
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

interface MenubarSubmenuProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MenubarSubmenu({ label, children, className }: MenubarSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={submenuRef}
      className={cn('relative', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={cn(
          'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
          'focus:outline-none focus:bg-gray-100 rounded hover:bg-gray-100'
        )}
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-0 left-full ml-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  );
}

interface MenubarSeparatorProps {
  className?: string;
}

export function MenubarSeparator({ className }: MenubarSeparatorProps) {
  return (
    <div className={cn('my-1 border-t border-gray-200', className)} role="separator" />
  );
}

interface MenubarCheckboxItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function MenubarCheckboxItem({
  checked,
  onCheckedChange,
  children,
  disabled = false,
  className,
}: MenubarCheckboxItemProps) {
  const context = useContext(MenubarContext);

  const handleClick = () => {
    if (disabled) return;
    onCheckedChange(!checked);
    context?.setActiveMenu(null);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
        'focus:outline-none focus:bg-gray-100 rounded',
        disabled && 'opacity-50 cursor-not-allowed',
        'text-gray-700 hover:bg-gray-100',
        className
      )}
      role="menuitemcheckbox"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <span>{children}</span>
      {checked && <Check className="w-4 h-4" />}
    </button>
  );
}

// Compound components
Menubar.Menu = MenubarMenu;
Menubar.Content = MenubarContent;
Menubar.Item = MenubarItem;
Menubar.Submenu = MenubarSubmenu;
Menubar.Separator = MenubarSeparator;
Menubar.CheckboxItem = MenubarCheckboxItem;
