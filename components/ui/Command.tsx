'use client';

import { useState, useEffect, useRef, KeyboardEvent, ReactNode } from 'react';
import { Search, Command as CommandIcon, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  group?: string;
  action: () => void;
}

interface CommandProps {
  items: CommandItem[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  hotkey?: string;
  groups?: string[];
}

export function Command({
  items,
  placeholder = 'Type a command or search...',
  emptyText = 'No results found.',
  className,
  onOpenChange,
  hotkey = 'ctrl+k',
  groups = ['General', 'Navigation', 'Actions'],
}: CommandProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter(item => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.group?.toLowerCase().includes(searchLower)
    );
  });

  const groupedItems = groups.reduce((acc, group) => {
    const groupItems = filteredItems.filter(item => item.group === group);
    if (groupItems.length > 0) {
      acc[group] = groupItems;
    }
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const allItems = Object.values(groupedItems).flat();

  const handleOpen = () => {
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setSelectedIndex(0);
    onOpenChange?.(false);
  };

  const handleSelect = (item: CommandItem) => {
    item.action();
    handleClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) {
          handleSelect(allItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && allItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, allItems.length]);

  // Register global hotkey
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress as any);
    return () => window.removeEventListener('keydown', handleKeyPress as any);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center justify-between w-64 px-4 py-2',
          'text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg',
          'hover:bg-gray-100 hover:border-gray-300 transition-colors',
          className
        )}
      >
        <div className="flex items-center space-x-3">
          <Search className="w-4 h-4 text-gray-400" />
          <span>{placeholder}</span>
        </div>
        <kbd className="px-2 py-1 text-xs bg-white border border-gray-300 rounded">
          {hotkey}
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div
        className={cn(
          'fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50',
          'animate-fade-in',
          className
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center border-b border-gray-200 p-4">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-lg"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-expanded="true"
          />
          <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-[400px] overflow-y-auto p-2"
          role="listbox"
          aria-label="Command results"
        >
          {Object.keys(groupedItems).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{emptyText}</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([group, groupItems]) => (
              <div key={group} className="mb-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group}
                </h3>
                <div className="space-y-1">
                  {groupItems.map((item, index) => {
                    const globalIndex = allItems.findIndex(i => i.id === item.id);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        data-index={globalIndex}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                          'focus:outline-none focus:bg-gray-100',
                          isSelected ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                          )}>
                            {item.icon || <CommandIcon className="w-4 h-4" />}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500">{item.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.shortcut && (
                            <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-red-600" />}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Enter</kbd>
                <span>Select</span>
              </div>
            </div>
            <span>{allItems.length} results</span>
          </div>
        </div>
      </div>
    </>
  );
}
