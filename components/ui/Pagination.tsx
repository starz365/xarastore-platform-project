import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  showPrevNext?: boolean;
  showFirstLast?: boolean;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  disabledClassName?: string;
  prevNextClassName?: string;
  firstLastClassName?: string;
  ellipsisClassName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  showPrevNext = true,
  showFirstLast = false,
  className,
  itemClassName,
  activeClassName = 'bg-red-600 text-white',
  disabledClassName = 'opacity-50 cursor-not-allowed',
  prevNextClassName,
  firstLastClassName,
  ellipsisClassName,
}: PaginationProps) {
  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  const generatePages = () => {
    const totalNumbers = siblingCount * 2 + 3 + boundaryCount * 2;
    const totalBlocks = totalNumbers + 2;

    if (totalPages <= totalBlocks) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, boundaryCount + 2);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPages - boundaryCount - 1
    );

    const shouldShowLeftDots = leftSiblingIndex > boundaryCount + 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - boundaryCount - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 2 + 2 * siblingCount + boundaryCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, 'ellipsis', ...range(totalPages - boundaryCount + 1, totalPages)];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 2 + 2 * siblingCount + boundaryCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [...range(1, boundaryCount), 'ellipsis', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [
        ...range(1, boundaryCount),
        'ellipsis',
        ...middleRange,
        'ellipsis',
        ...range(totalPages - boundaryCount + 1, totalPages),
      ];
    }

    return range(1, totalPages);
  };

  const pages = generatePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number') {
      onPageChange(page);
    }
  };

  const renderPageItem = (page: number | string, index: number) => {
    if (page === 'ellipsis') {
      return (
        <span
          key={`ellipsis-${index}`}
          className={cn(
            'flex items-center justify-center w-10 h-10',
            ellipsisClassName
          )}
          aria-hidden="true"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </span>
      );
    }

    const isActive = page === currentPage;

    return (
      <button
        key={page}
        type="button"
        onClick={() => handlePageClick(page)}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600',
          isActive ? activeClassName : 'text-gray-700',
          itemClassName
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`Go to page ${page}`}
      >
        {page}
      </button>
    );
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn('flex items-center justify-center space-x-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      {/* First Page */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => !isFirstPage && onPageChange(1)}
          disabled={isFirstPage}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600',
            'text-gray-700',
            isFirstPage && disabledClassName,
            firstLastClassName
          )}
          aria-label="Go to first page"
          aria-disabled={isFirstPage}
        >
          «
        </button>
      )}

      {/* Previous Page */}
      {showPrevNext && (
        <button
          type="button"
          onClick={() => !isFirstPage && onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600',
            'text-gray-700',
            isFirstPage && disabledClassName,
            prevNextClassName
          )}
          aria-label="Go to previous page"
          aria-disabled={isFirstPage}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Page Numbers */}
      {pages.map(renderPageItem)}

      {/* Next Page */}
      {showPrevNext && (
        <button
          type="button"
          onClick={() => !isLastPage && onPageChange(currentPage + 1)}
          disabled={isLastPage}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600',
            'text-gray-700',
            isLastPage && disabledClassName,
            prevNextClassName
          )}
          aria-label="Go to next page"
          aria-disabled={isLastPage}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Last Page */}
      {showFirstLast && (
        <button
          type="button"
          onClick={() => !isLastPage && onPageChange(totalPages)}
          disabled={isLastPage}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600',
            'text-gray-700',
            isLastPage && disabledClassName,
            firstLastClassName
          )}
          aria-label="Go to last page"
          aria-disabled={isLastPage}
        >
          »
        </button>
      )}
    </nav>
  );
}

// Pagination Info component
interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn('text-sm text-gray-600', className)}>
      Showing <span className="font-semibold">{start}-{end}</span> of{' '}
      <span className="font-semibold">{totalItems.toLocaleString()}</span> items
    </div>
  );
}

// Pagination with Results per page
interface PaginationWithSizeProps extends PaginationProps {
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
  resultsText?: string;
}

export function PaginationWithSize({
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  resultsText = 'Results per page',
  ...paginationProps
}: PaginationWithSizeProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">{resultsText}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <Pagination {...paginationProps} />
    </div>
  );
}

// Compound components
Pagination.Info = PaginationInfo;
Pagination.WithSize = PaginationWithSize;
