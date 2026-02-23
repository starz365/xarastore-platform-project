import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/css';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  separator?: React.ReactNode;
  showHome?: boolean;
}

export function Breadcrumb({ className, separator, showHome = true, children, ...props }: BreadcrumbProps) {
  const childrenArray = React.Children.toArray(children);
  const separatorElement = separator || <ChevronRight className="w-4 h-4 text-gray-400" />;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
      {...props}
    >
      <ol className="flex items-center space-x-2">
        {showHome && (
          <li className="flex items-center">
            <a
              href="/"
              className="text-gray-600 hover:text-red-600 transition-colors flex items-center"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </a>
          </li>
        )}
        
        {childrenArray.map((child, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2" aria-hidden="true">
                {separatorElement}
              </span>
            )}
            {child}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
  href?: string;
  isCurrentPage?: boolean;
}

export function BreadcrumbItem({ 
  href, 
  isCurrentPage = false, 
  className, 
  children, 
  ...props 
}: BreadcrumbItemProps) {
  if (isCurrentPage) {
    return (
      <span
        className={cn('text-gray-900 font-medium truncate max-w-[200px]', className)}
        aria-current="page"
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        'text-gray-600 hover:text-red-600 transition-colors truncate max-w-[150px]',
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// Compound component
Breadcrumb.Item = BreadcrumbItem;
