'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/css';

interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
    }[];
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      legend?: {
        position?: 'top' | 'bottom' | 'left' | 'right';
        display?: boolean;
      };
      title?: {
        display?: boolean;
        text?: string;
      };
      tooltip?: {
        enabled?: boolean;
        mode?: 'index' | 'dataset' | 'point' | 'nearest' | 'x' | 'y';
      };
    };
    scales?: {
      x?: {
        grid?: {
          display?: boolean;
        };
        ticks?: {
          color?: string;
        };
      };
      y?: {
        beginAtZero?: boolean;
        grid?: {
          display?: boolean;
        };
        ticks?: {
          color?: string;
          callback?: (value: number) => string;
        };
      };
    };
  };
  className?: string;
  height?: number;
  width?: number;
  onChartReady?: (chart: any) => void;
}

const defaultColors = [
  '#dc2626', // Red (Brand)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#ef4444', // Red (Light)
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export function Chart({
  type,
  data,
  options = {},
  className,
  height = 300,
  width,
  onChartReady,
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  // Process data to add default colors if not provided
  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 
        (type === 'line' || type === 'radar' 
          ? 'transparent'
          : Array.isArray(dataset.data)
          ? dataset.data.map((_, i) => defaultColors[i % defaultColors.length])
          : defaultColors[index % defaultColors.length]),
      borderColor: dataset.borderColor || 
        (type === 'line' || type === 'radar'
          ? defaultColors[index % defaultColors.length]
          : dataset.backgroundColor),
      borderWidth: dataset.borderWidth || 2,
      fill: dataset.fill !== undefined ? dataset.fill : type === 'line',
      tension: dataset.tension || (type === 'line' ? 0.4 : 0),
    })),
  };

  // Default options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
        labels: {
          color: '#6b7280',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
        },
      },
      title: {
        display: false,
        text: '',
        color: '#111827',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        bodyFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        padding: 8,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== undefined) {
              label += new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 0,
              }).format(context.parsed.y);
            } else if (context.parsed !== undefined) {
              label += context.parsed;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 11,
          },
          callback: (value: number) => {
            if (value >= 1000000) {
              return `KES ${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `KES ${(value / 1000).toFixed(1)}K`;
            }
            return `KES ${value}`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales,
    },
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const initChart = async () => {
      try {
        // Dynamically import Chart.js
        const { Chart: ChartJS, registerables } = await import('chart.js');
        ChartJS.register(...registerables);

        if (chartRef.current) {
          chartRef.current.destroy();
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        chartRef.current = new ChartJS(ctx, {
          type,
          data: processedData,
          options: mergedOptions,
        });

        onChartReady?.(chartRef.current);
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [type, processedData, mergedOptions]);

  return (
    <div className={cn('relative', className)} style={{ height: `${height}px`, width }}>
      <canvas
        ref={canvasRef}
        aria-label={`${type} chart showing ${data.datasets.map(d => d.label).join(', ')}`}
        role="img"
      />
      
      {/* Fallback for no JavaScript */}
      <noscript>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">Chart requires JavaScript</p>
        </div>
      </noscript>
    </div>
  );
}

// Pre-configured chart types for common use cases

export function SalesChart({ data, ...props }: Omit<ChartProps, 'type'>) {
  return (
    <Chart
      type="line"
      data={data}
      options={{
        plugins: {
          title: {
            display: true,
            text: 'Sales Performance',
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (value: number) => `KES ${value.toLocaleString('en-KE')}`,
            },
          },
        },
      }}
      {...props}
    />
  );
}

export function RevenueChart({ data, ...props }: Omit<ChartProps, 'type'>) {
  return (
    <Chart
      type="bar"
      data={data}
      options={{
        plugins: {
          title: {
            display: true,
            text: 'Revenue Breakdown',
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (value: number) => `KES ${value.toLocaleString('en-KE')}`,
            },
          },
        },
      }}
      {...props}
    />
  );
}

export function CategoryChart({ data, ...props }: Omit<ChartProps, 'type'>) {
  return (
    <Chart
      type="doughnut"
      data={data}
      options={{
        plugins: {
          title: {
            display: true,
            text: 'Category Distribution',
          },
        },
      }}
      {...props}
    />
  );
}
