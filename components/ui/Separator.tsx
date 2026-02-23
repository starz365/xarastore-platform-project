import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/css';

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  thickness?: 'thin' | 'medium' | 'thick';
  variant?: 'default' | 'dashed' | 'dotted';
}

const thicknessClasses = {
  thin: '',
  medium: '',
  thick: '',
};

const variantClasses = {
  default: 'bg-gray-200',
  dashed: 'border-dashed border-gray-300',
  dotted: 'border-dotted border-gray-300',
};

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  thickness = 'thin',
  variant = 'default',
  className,
  ...props
}: SeparatorProps) {
  const semanticOrientation = decorative ? undefined : orientation;
  const isHorizontal = orientation === 'horizontal';

  const thicknessStyles = {
    thin: isHorizontal ? 'h-px' : 'w-px',
    medium: isHorizontal ? 'h-0.5' : 'w-0.5',
    thick: isHorizontal ? 'h-1' : 'w-1',
  };

  const variantStyles = {
    default: isHorizontal ? '' : '',
    dashed: isHorizontal ? 'border-t' : 'border-l',
    dotted: isHorizontal ? 'border-t' : 'border-l',
  };

  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={semanticOrientation}
      className={cn(
        'shrink-0',
        thicknessStyles[thickness],
        variantStyles[variant],
        variantClasses[variant],
        isHorizontal ? 'w-full' : 'h-full',
        className
      )}
      {...props}
    />
  );
}

// Separator with text
interface SeparatorWithTextProps extends Omit<SeparatorProps, 'orientation' | 'decorative'> {
  text?: string;
  textPosition?: 'center' | 'left' | 'right';
  textClassName?: string;
}

export function SeparatorWithText({
  text,
  textPosition = 'center',
  textClassName,
  className,
  ...separatorProps
}: SeparatorWithTextProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {(textPosition === 'center' || textPosition === 'left') && (
        <Separator
          orientation="horizontal"
          decorative={false}
          className="flex-1"
          {...separatorProps}
        />
      )}
      
      {text && (
        <span
          className={cn(
            'mx-3 text-sm text-gray-500 whitespace-nowrap',
            textPosition === 'left' && 'order-first mr-3 ml-0',
            textPosition === 'right' && 'order-last ml-3 mr-0',
            textClassName
          )}
        >
          {text}
        </span>
      )}
      
      {(textPosition === 'center' || textPosition === 'right') && (
        <Separator
          orientation="horizontal"
          decorative={false}
          className="flex-1"
          {...separatorProps}
        />
      )}
    </div>
  );
}

// Separator with icon
interface SeparatorWithIconProps extends Omit<SeparatorProps, 'orientation' | 'decorative'> {
  icon: React.ReactNode;
  iconPosition?: 'center' | 'left' | 'right';
  iconClassName?: string;
}

export function SeparatorWithIcon({
  icon,
  iconPosition = 'center',
  iconClassName,
  className,
  ...separatorProps
}: SeparatorWithIconProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {(iconPosition === 'center' || iconPosition === 'left') && (
        <Separator
          orientation="horizontal"
          decorative={false}
          className="flex-1"
          {...separatorProps}
        />
      )}
      
      <div
        className={cn(
          'mx-3 text-gray-400',
          iconPosition === 'left' && 'order-first mr-3 ml-0',
          iconPosition === 'right' && 'order-last ml-3 mr-0',
          iconClassName
        )}
      >
        {icon}
      </div>
      
      {(iconPosition === 'center' || iconPosition === 'right') && (
        <Separator
          orientation="horizontal"
          decorative={false}
          className="flex-1"
          {...separatorProps}
        />
      )}
    </div>
  );
}

// Compound components
Separator.WithText = SeparatorWithText;
Separator.WithIcon = SeparatorWithIcon;
