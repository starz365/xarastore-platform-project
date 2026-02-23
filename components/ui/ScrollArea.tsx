'use client';

import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils/css';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollHideDelay?: number;
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  className?: string;
  viewportClassName?: string;
  scrollbarClassName?: string;
  thumbClassName?: string;
  cornerClassName?: string;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({
    children,
    orientation = 'vertical',
    scrollHideDelay = 600,
    type = 'hover',
    className,
    viewportClassName,
    scrollbarClassName,
    thumbClassName,
    cornerClassName,
    ...props
  }, ref) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const [showScrollbar, setShowScrollbar] = useState(type === 'always');
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      if (type === 'hover' || type === 'scroll') {
        const handleScrollStart = () => {
          setIsScrolling(true);
          setShowScrollbar(true);
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };

        const handleScrollEnd = () => {
          setIsScrolling(false);
          
          if (type === 'scroll') {
            timeoutRef.current = setTimeout(() => {
              setShowScrollbar(false);
            }, scrollHideDelay);
          }
        };

        const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.addEventListener('scroll', handleScrollStart);
          viewport.addEventListener('scrollend', handleScrollEnd);
          
          return () => {
            viewport.removeEventListener('scroll', handleScrollStart);
            viewport.removeEventListener('scrollend', handleScrollEnd);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          };
        }
      }
    }, [type, scrollHideDelay]);

    const shouldShowScrollbar = type === 'always' || showScrollbar || isScrolling;

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        {...props}
      >
        <div
          data-radix-scroll-area-viewport
          className={cn(
            'h-full w-full rounded-[inherit]',
            viewportClassName
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}
        </div>

        {/* Vertical Scrollbar */}
        {(orientation === 'vertical' || orientation === 'both') && (
          <div
            className={cn(
              'flex touch-none select-none transition-opacity',
              'absolute top-0 right-0 h-full w-3 p-0.5',
              !shouldShowScrollbar && 'opacity-0',
              scrollbarClassName
            )}
            style={{
              pointerEvents: shouldShowScrollbar ? 'auto' : 'none',
            }}
          >
            <div
              className={cn(
                'relative flex-1 rounded-full bg-gray-200',
                thumbClassName
              )}
            >
              <div
                className="absolute top-0 left-0 w-full rounded-full bg-gray-400"
                style={{
                  height: 'var(--radix-scroll-area-thumb-height)',
                  transform: 'translateY(var(--radix-scroll-area-thumb-top))',
                }}
              />
            </div>
          </div>
        )}

        {/* Horizontal Scrollbar */}
        {(orientation === 'horizontal' || orientation === 'both') && (
          <div
            className={cn(
              'flex touch-none select-none transition-opacity',
              'absolute bottom-0 left-0 h-3 w-full p-0.5',
              !shouldShowScrollbar && 'opacity-0',
              scrollbarClassName
            )}
            style={{
              pointerEvents: shouldShowScrollbar ? 'auto' : 'none',
            }}
          >
            <div
              className={cn(
                'relative flex-1 rounded-full bg-gray-200',
                thumbClassName
              )}
            >
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-gray-400"
                style={{
                  width: 'var(--radix-scroll-area-thumb-width)',
                  transform: 'translateX(var(--radix-scroll-area-thumb-left))',
                }}
              />
            </div>
          </div>
        )}

        {/* Corner */}
        {orientation === 'both' && (
          <div
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3',
              cornerClassName
            )}
          />
        )}

        {/* Hide native scrollbar */}
        <style jsx>{`
          [data-radix-scroll-area-viewport]::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// Scroll area with custom scrollbar
interface CustomScrollAreaProps extends Omit<ScrollAreaProps, 'type'> {
  showScrollbar?: boolean;
}

export function CustomScrollArea({
  showScrollbar = true,
  children,
  ...props
}: CustomScrollAreaProps) {
  return (
    <ScrollArea
      type={showScrollbar ? 'always' : 'hover'}
      {...props}
    >
      {children}
    </ScrollArea>
  );
}

// Scroll area with fade effects
interface FadeScrollAreaProps extends ScrollAreaProps {
  fadeSize?: number;
  fadeColor?: string;
}

export function FadeScrollArea({
  fadeSize = 32,
  fadeColor = 'white',
  children,
  className,
  ...props
}: FadeScrollAreaProps) {
  return (
    <div className={cn('relative', className)}>
      <ScrollArea {...props}>
        {children}
      </ScrollArea>
      
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: `${fadeSize}px`,
          background: `linear-gradient(to bottom, ${fadeColor}, transparent)`,
        }}
      />
      
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: `${fadeSize}px`,
          background: `linear-gradient(to top, ${fadeColor}, transparent)`,
        }}
      />
    </div>
  );
}

// Compound components
ScrollArea.Custom = CustomScrollArea;
ScrollArea.Fade = FadeScrollArea;
