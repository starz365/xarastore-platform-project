import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for conditionally joining CSS class names together.
 * Merges Tailwind CSS classes properly to avoid conflicts.
 * 
 * @example
 * // Basic usage
 * cn('text-red-600', 'font-bold')
 * 
 * // Conditional classes
 * cn('text-red-600', isActive && 'font-bold')
 * 
 * // Object notation
 * cn({ 'text-red-600': isActive, 'text-gray-600': !isActive })
 * 
 * // Arrays and nested arrays
 * cn(['text-red-600', 'font-bold'], ['p-4', 'rounded-lg'])
 * 
 * @param inputs - Class names or conditions to merge
 * @returns Merged class string optimized for Tailwind CSS
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates a CSS class utility for responsive design variations
 * @param base - Base classes
 * @param variants - Responsive variants
 * @returns Merged responsive classes
 */
export function responsiveCn(
  base: ClassValue,
  variants: {
    sm?: ClassValue;
    md?: ClassValue;
    lg?: ClassValue;
    xl?: ClassValue;
    '2xl'?: ClassValue;
  }
): string {
  const responsiveClasses = Object.entries(variants)
    .map(([breakpoint, classes]) => {
      if (!classes) return '';
      return `${breakpoint}:${String(classes).replace(/\s+/g, ` ${breakpoint}:`)}`;
    })
    .filter(Boolean)
    .join(' ');

  return cn(base, responsiveClasses);
}

/**
 * Creates conditional CSS classes based on component variants
 * @param base - Base component classes
 * @param variants - Variant definitions
 * @returns Function that returns merged classes based on variant props
 */
export function createVariantCn<T extends Record<string, Record<string, ClassValue>>>(
  base: ClassValue,
  variants: T
) {
  return (props: { [K in keyof T]?: keyof T[K] }) => {
    const variantClasses = Object.entries(props)
      .map(([variantName, variantValue]) => {
        const variantConfig = variants[variantName as keyof T];
        if (!variantConfig || !variantValue) return '';
        return variantConfig[variantValue as keyof typeof variantConfig];
      })
      .filter(Boolean);

    return cn(base, ...variantClasses);
  };
}

/**
 * Utility for creating BEM-style CSS class names
 * @param block - Block name
 * @returns Functions for generating element and modifier classes
 */
export function bem(block: string) {
  return {
    block: (modifiers?: string | Record<string, boolean>) => {
      if (!modifiers) return block;
      if (typeof modifiers === 'string') return `${block} ${block}--${modifiers}`;
      
      const modifierClasses = Object.entries(modifiers)
        .filter(([, active]) => active)
        .map(([modifier]) => `${block}--${modifier}`)
        .join(' ');
      
      return cn(block, modifierClasses);
    },
    element: (element: string, modifiers?: string | Record<string, boolean>) => {
      const elementClass = `${block}__${element}`;
      
      if (!modifiers) return elementClass;
      if (typeof modifiers === 'string') return `${elementClass} ${elementClass}--${modifiers}`;
      
      const modifierClasses = Object.entries(modifiers)
        .filter(([, active]) => active)
        .map(([modifier]) => `${elementClass}--${modifier}`)
        .join(' ');
      
      return cn(elementClass, modifierClasses);
    },
    modifier: (modifier: string) => `${block}--${modifier}`,
  };
}

/**
 * Creates CSS custom property string for dynamic styling
 * @param properties - CSS custom properties
 * @returns CSS custom property string
 */
export function cssProps(properties: Record<string, string | number>): string {
  return Object.entries(properties)
    .map(([key, value]) => `--${key}: ${value};`)
    .join(' ');
}

/**
 * Generates safe CSS class names for user-generated content
 * @param prefix - Class name prefix
 * @param value - User input value
 * @returns Sanitized CSS class name
 */
export function safeClassName(prefix: string, value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${prefix}-${sanitized}`;
}

/**
 * Extracts and merges CSS classes from React props
 * @param props - Component props
 * @param classNameProp - Name of the className prop (default: 'className')
 * @returns Merged class string
 */
export function extractClassName<T extends { className?: string }>(
  props: T,
  classNameProp: string = 'className'
): string {
  const className = props[classNameProp as keyof T];
  const rest = { ...props };
  delete rest[classNameProp as keyof T];
  
  return typeof className === 'string' ? className : '';
}

/**
 * Creates a memoized version of cn for performance optimization
 */
export const memoizedCn = (() => {
  const cache = new Map<string, string>();
  
  return (...inputs: ClassValue[]): string => {
    const key = JSON.stringify(inputs);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = cn(...inputs);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
})();

/**
 * Utility for creating CSS-in-JS style objects from class names
 * @param styles - CSS modules or style object
 * @returns Function to merge style objects
 */
export function createStyleUtils<T extends Record<string, string>>(styles: T) {
  return {
    /**
     * Get style by key
     */
    get: (key: keyof T) => styles[key],
    
    /**
     * Merge multiple styles
     */
    merge: (...keys: (keyof T)[]) => {
      return keys.map(key => styles[key]).filter(Boolean).join(' ');
    },
    
    /**
     * Create conditional style merging
     */
    conditional: (conditions: Record<keyof T, boolean>) => {
      return Object.entries(conditions)
        .filter(([, active]) => active)
        .map(([key]) => styles[key as keyof T])
        .join(' ');
    },
    
    /**
     * Create BEM-style selectors within CSS modules
     */
    bem: (block: keyof T) => ({
      block: (modifier?: string) => {
        const base = styles[block];
        return modifier ? `${base} ${base}--${modifier}` : base;
      },
      element: (element: string, modifier?: string) => {
        const elementClass = `${styles[block]}__${element}`;
        return modifier ? `${elementClass} ${elementClass}--${modifier}` : elementClass;
      },
    }),
  };
}

// Re-export clsx and twMerge for convenience
export { clsx, twMerge };

// Example usage types for better TypeScript support
export type CSSUtils = {
  cn: typeof cn;
  responsiveCn: typeof responsiveCn;
  createVariantCn: typeof createVariantCn;
  bem: typeof bem;
  cssProps: typeof cssProps;
  safeClassName: typeof safeClassName;
  extractClassName: typeof extractClassName;
  memoizedCn: typeof memoizedCn;
  createStyleUtils: typeof createStyleUtils;
};
