'use client';

import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T) => string);
  striped?: boolean;
  compact?: boolean;
}

export function Table<T extends { id: string | number }>({
  columns,
  data,
  onSort,
  sortColumn,
  sortDirection,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  striped = true,
  compact = false,
}: TableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    
    const direction = sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, direction);
  };

  const getRowClass = (item: T, index: number): string => {
    const baseClass = 'transition-colors';
    const clickableClass = onRowClick ? 'cursor-pointer hover:bg-gray-50' : '';
    const stripedClass = striped && index % 2 === 1 ? 'bg-gray-50' : '';
    
    const customClass = typeof rowClassName === 'function' 
      ? rowClassName(item)
      : rowClassName || '';
    
    const sizeClass = compact ? 'py-2' : 'py-4';
    
    return `${baseClass} ${clickableClass} ${stripedClass} ${customClass} ${sizeClass}`.trim();
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`px-6 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer select-none' : ''
                } ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                onClick={() => handleSort(column)}
              >
                <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
                  <span>{column.header}</span>
                  {column.sortable && (
                    <span className="ml-2 flex flex-col">
                      <ChevronUp
                        className={`w-3 h-3 ${sortColumn === column.key && sortDirection === 'asc' ? 'text-red-600' : 'text-gray-300'}`}
                      />
                      <ChevronDown
                        className={`w-3 h-3 -mt-1 ${sortColumn === column.key && sortDirection === 'desc' ? 'text-red-600' : 'text-gray-300'}`}
                      />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={item.id}
              className={getRowClass(item, index)}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td
                  key={`${item.id}-${column.key}`}
                  className={`px-6 ${compact ? 'py-2' : 'py-4'} whitespace-nowrap text-sm ${
                    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Order table specific component
interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  items: number;
}

export function OrderTable({ orders, loading }: { orders: Order[]; loading?: boolean }) {
  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (order) => (
        <span className="font-medium text-gray-900">{order.orderNumber}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (order) => (
        <div>
          <div className="font-medium text-gray-900">{order.customerName}</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (order) => (
        <div>
          <div className="text-gray-900">{new Date(order.date).toLocaleDateString()}</div>
          <div className="text-gray-500 text-xs">
            {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (order) => (
        <span className="font-bold text-gray-900">
          KES {order.total.toLocaleString('en-KE')}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (order) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {order.items}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (order) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
          processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
          shipped: { color: 'bg-purple-100 text-purple-800', label: 'Shipped' },
          delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
          cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
        };
        
        const config = statusConfig[order.status];
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={orders}
      loading={loading}
      emptyMessage="No orders found"
      onRowClick={(order) => console.log('Order clicked:', order)}
      striped
    />
  );
}
