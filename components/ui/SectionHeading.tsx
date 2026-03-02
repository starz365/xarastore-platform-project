'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './Button';

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
  align?: 'left' | 'center';
  size?: 'sm' | 'md' | 'lg';
}

export function SectionHeading({
  title,
  description,
  action,
  className,
  align = 'left',
  size = 'md',
}: SectionHeadingProps) {
  const sizeClasses = {
    sm: {
      title: 'text-xl md:text-2xl',
      description: 'text-sm',
    },
    md: {
      title: 'text-2xl md:text-3xl',
      description: 'text-base',
    },
    lg: {
      title: 'text-3xl md:text-4xl lg:text-5xl',
      description: 'text-lg',
    },
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className={cn('space-y-2', align === 'center' && 'text-center')}>
          <h2 className={cn('font-bold tracking-tight', sizeClasses[size].title)}>
            {title}
          </h2>
          {description && (
            <p className={cn('text-gray-600 max-w-2xl', sizeClasses[size].description)}>
              {description}
            </p>
          )}
        </div>

        {action && (
          <Button
            variant="ghost"
            asChild
            className="hidden sm:inline-flex items-center group"
          >
            <Link href={action.href}>
              {action.label}
              <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile action button */}
      {action && (
        <Button
          variant="link"
          asChild
          className="sm:hidden mt-2 p-0"
        >
          <Link href={action.href}>
            {action.label}
            <ChevronRight className="ml-1 w-4 h-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
