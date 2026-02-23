/**
 * Enterprise-grade class name utility for Xarastore platform.
 * Provides robust, type-safe class name merging with Tailwind CSS optimization.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Re-export types for convenience
export type { ClassValue } from 'clsx';

/**
 * Conditionally join CSS class names together with Tailwind CSS optimization.
 * This is the primary utility used throughout the Xarastore platform.
 * 
 * @example
 * // Basic usage
 * classNames('text-red-600', 'font-bold')
 * 
 * // Conditional classes
 * classNames('text-red-600', isActive && 'font-bold')
 * 
 * // Object notation
 * classNames({ 'text-red-600': isActive, 'text-gray-600': !isActive })
 * 
 * // Arrays and nested arrays
 * classNames(['text-red-600', 'font-bold'], ['p-4', 'rounded-lg'])
 * 
 * @param inputs - Class names or conditions to merge
 * @returns Merged class string optimized for Tailwind CSS
 */
export function classNames(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Alias for classNames for backwards compatibility
 */
export const cn = classNames;

/**
 * Creates a variant-based class name utility for component styling.
 * Provides type-safe variant combinations with intelligent merging.
 * 
 * @example
 * const button = createVariantClassNames({
 *   base: 'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
 *   variants: {
 *     variant: {
 *       primary: 'bg-red-600 text-white hover:bg-red-700',
 *       secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
 *       ghost: 'bg-transparent hover:bg-gray-100',
 *     },
 *     size: {
 *       sm: 'px-3 py-1.5 text-sm',
 *       md: 'px-4 py-2 text-base',
 *       lg: 'px-6 py-3 text-lg',
 *     },
 *     disabled: {
 *       true: 'opacity-50 cursor-not-allowed',
 *       false: '',
 *     },
 *   },
 *   defaultVariants: {
 *     variant: 'primary',
 *     size: 'md',
 *     disabled: false,
 *   },
 * });
 * 
 * // Usage
 * const classes = button({ variant: 'secondary', size: 'lg' });
 */
export function createVariantClassNames<
  TBase extends string,
  TVariants extends Record<string, Record<string, string>>,
  TDefaultVariants extends Partial<Record<keyof TVariants, keyof TVariants[keyof TVariants]>>
>(config: {
  base: TBase;
  variants: TVariants;
  defaultVariants?: TDefaultVariants;
  compoundVariants?: Array<{
    variants: Partial<Record<keyof TVariants, keyof TVariants[keyof TVariants]>>;
    className: string;
  }>;
}) {
  type VariantProps = {
    [K in keyof TVariants]?: keyof TVariants[K];
  };

  return (props: VariantProps = {}): string => {
    const variantEntries = Object.entries(config.variants) as Array<
      [keyof TVariants, Record<string, string>]
    >;

    const variantClasses = variantEntries
      .map(([variantName, variantConfig]) => {
        const variantValue =
          props[variantName] ??
          config.defaultVariants?.[variantName] ??
          Object.keys(variantConfig)[0];

        return variantConfig[variantValue as string] || '';
      })
      .filter(Boolean);

    const compoundClasses = config.compoundVariants
      ?.filter((compound) => {
        return Object.entries(compound.variants).every(([key, value]) => {
          const propValue = props[key as keyof TVariants] ?? config.defaultVariants?.[key as keyof TVariants];
          return propValue === value;
        });
      })
      .map((compound) => compound.className)
      .filter(Boolean) || [];

    return classNames(
      config.base,
      ...variantClasses,
      ...compoundClasses
    );
  };
}

/**
 * Creates responsive class names for different breakpoints.
 * Automatically handles Tailwind CSS responsive prefixes.
 * 
 * @example
 * const responsive = createResponsiveClassNames({
 *   base: 'flex flex-col',
 *   sm: 'sm:flex-row',
 *   md: 'md:space-x-4',
 *   lg: 'lg:space-x-8',
 * });
 */
export function createResponsiveClassNames(config: {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string {
  const classes = [config.base];

  const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
  for (const breakpoint of breakpoints) {
    const breakpointClass = config[breakpoint];
    if (breakpointClass) {
      classes.push(breakpointClass);
    }
  }

  return classNames(...classes);
}

/**
 * Creates a BEM (Block Element Modifier) utility for CSS class generation.
 * Provides type-safe BEM class construction with modifier support.
 * 
 * @example
 * const card = createBEM('card');
 * 
 * // Block with modifiers
 * card.block({ elevated: true, interactive: false });
 * // Returns: 'card card--elevated'
 * 
 * // Element
 * card.element('header');
 * // Returns: 'card__header'
 * 
 * // Element with modifiers
 * card.element('title', { large: true, bold: false });
 * // Returns: 'card__title card__title--large'
 */
export function createBEM(block: string) {
  return {
    /**
     * Generate block class with optional modifiers
     */
    block: (modifiers?: Record<string, boolean> | string): string => {
      if (!modifiers) return block;
      
      if (typeof modifiers === 'string') {
        return classNames(block, `${block}--${modifiers}`);
      }

      const modifierClasses = Object.entries(modifiers)
        .filter(([, active]) => active)
        .map(([modifier]) => `${block}--${modifier}`);

      return classNames(block, ...modifierClasses);
    },

    /**
     * Generate element class with optional modifiers
     */
    element: (element: string, modifiers?: Record<string, boolean> | string): string => {
      const elementClass = `${block}__${element}`;
      
      if (!modifiers) return elementClass;
      
      if (typeof modifiers === 'string') {
        return classNames(elementClass, `${elementClass}--${modifiers}`);
      }

      const modifierClasses = Object.entries(modifiers)
        .filter(([, active]) => active)
        .map(([modifier]) => `${elementClass}--${modifier}`);

      return classNames(elementClass, ...modifierClasses);
    },

    /**
     * Generate modifier class for block or element
     */
    modifier: (name: string): string => `${block}--${name}`,

    /**
     * Generate element modifier class
     */
    elementModifier: (element: string, modifier: string): string =>
      `${block}__${element}--${modifier}`,
  };
}

/**
 * Utility for creating CSS custom properties (CSS variables) from JavaScript values.
 * Returns a style object ready for React's style prop.
 * 
 * @example
 * const styles = createCSSProperties({
 *   '--primary-color': '#dc2626',
 *   '--spacing-unit': '1rem',
 *   '--animation-duration': '300ms',
 * });
 * 
 * // Usage in component
 * <div style={styles}>Content</div>
 */
export function createCSSProperties(
  properties: Record<string, string | number>
): React.CSSProperties {
  const cssProperties: Record<string, string> = {};

  for (const [key, value] of Object.entries(properties)) {
    const cssKey = key.startsWith('--') ? key : `--${key}`;
    cssProperties[cssKey] = String(value);
  }

  return cssProperties as React.CSSProperties;
}

/**
 * Safe class name generator for user-generated content.
 * Sanitizes input to create valid CSS class names.
 * 
 * @example
 * safeClassName('user', 'John Doe 123!');
 * // Returns: 'user-john-doe-123'
 */
export function safeClassName(prefix: string, value: string): string {
  if (!value.trim()) return prefix;

  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return `${prefix}-${sanitized}`;
}

/**
 * Extracts and merges class names from component props.
 * Useful for higher-order components or wrapper components.
 * 
 * @example
 * function withClassName<P extends { className?: string }>(
 *   Component: React.ComponentType<P>
 * ) {
 *   return function WrappedComponent(props: P) {
 *     const className = extractClassName(props);
 *     const enhancedClassName = classNames(className, 'enhanced-styles');
 *     
 *     return <Component {...props} className={enhancedClassName} />;
 *   };
 * }
 */
export function extractClassName<T extends { className?: string }>(
  props: T,
  classNameKey: keyof T = 'className' as keyof T
): string {
  const className = props[classNameKey];
  return typeof className === 'string' ? className : '';
}

/**
 * Memoized version of classNames for performance optimization.
 * Caches results to avoid recomputation of identical class name combinations.
 */
export const memoizedClassNames = (() => {
  const cache = new Map<string, string>();
  let cacheSize = 0;
  const MAX_CACHE_SIZE = 5000;

  return (...inputs: ClassValue[]): string => {
    // Create cache key
    const key = inputs
      .map(input => {
        if (typeof input === 'string') return input;
        if (typeof input === 'number') return String(input);
        if (Array.isArray(input)) return JSON.stringify(input);
        if (typeof input === 'object' && input !== null) {
          return Object.entries(input)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
        }
        return '';
      })
      .filter(Boolean)
      .join('::');

    // Check cache
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Compute and cache
    const result = classNames(...inputs);
    
    if (cacheSize >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first inserted)
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
      cacheSize--;
    }

    cache.set(key, result);
    cacheSize++;

    return result;
  };
})();

/**
 * Type-safe class name builder with chaining API.
 * 
 * @example
 * const builder = classNameBuilder('base-class')
 *   .add('additional-class')
 *   .addIf('conditional-class', isActive)
 *   .addVariants({
 *     primary: 'bg-red-600',
 *     secondary: 'bg-gray-600',
 *   }, variant)
 *   .build();
 */
export function classNameBuilder(base: string = '') {
  const classes: string[] = base ? [base] : [];

  return {
    /**
     * Add a class name
     */
    add(className: string): typeof this {
      if (className) classes.push(className);
      return this;
    },

    /**
     * Conditionally add a class name
     */
    addIf(className: string, condition: boolean): typeof this {
      if (condition && className) classes.push(className);
      return this;
    },

    /**
     * Add a class name based on a value from a variants map
     */
    addVariants<T extends Record<string, string>>(
      variants: T,
      value: keyof T | undefined
    ): typeof this {
      if (value && variants[value]) {
        classes.push(variants[value]);
      }
      return this;
    },

    /**
     * Add multiple class names
     */
    addAll(...classNames: string[]): typeof this {
      classes.push(...classNames.filter(Boolean));
      return this;
    },

    /**
     * Add responsive class names
     */
    addResponsive(responsive: Record<string, string>): typeof this {
      for (const [breakpoint, className] of Object.entries(responsive)) {
        if (className) {
          const prefixed = breakpoint === 'base' ? className : `${breakpoint}:${className}`;
          classes.push(prefixed);
        }
      }
      return this;
    },

    /**
     * Merge with another className string or builder
     */
    merge(other: string | { build(): string }): typeof this {
      const otherClasses = typeof other === 'string' ? other : other.build();
      if (otherClasses) {
        classes.push(otherClasses);
      }
      return this;
    },

    /**
     * Build and return the final class name string
     */
    build(): string {
      return classNames(...classes);
    },

    /**
     * Build and return the final class name string, optimized with memoization
     */
    buildMemoized(): string {
      return memoizedClassNames(...classes);
    },
  };
}

/**
 * Utility for creating CSS class names from CSS modules
 * 
 * @example
 * import styles from './Component.module.css';
 * const getClassName = createModuleClassNames(styles);
 * 
 * const className = getClassName({
 *   base: 'container',
 *   active: 'is-active',
 *   disabled: 'is-disabled',
 * }, { active: true, disabled: false });
 */
export function createModuleClassNames<T extends Record<string, string>>(styles: T) {
  return (
    classMap: Record<string, string>,
    conditions: Record<string, boolean> = {}
  ): string => {
    const classNamesList = Object.entries(classMap)
      .filter(([key]) => conditions[key] !== false)
      .map(([, className]) => styles[className])
      .filter(Boolean);

    return classNames(...classNamesList);
  };
}

// Export all utilities as named exports and default export
export default classNames;

// Re-export clsx and twMerge for advanced usage
export { clsx, twMerge };

// Type utilities
export type ClassNamesUtility = typeof classNames & {
  createVariantClassNames: typeof createVariantClassNames;
  createResponsiveClassNames: typeof createResponsiveClassNames;
  createBEM: typeof createBEM;
  createCSSProperties: typeof createCSSProperties;
  safeClassName: typeof safeClassName;
  extractClassName: typeof extractClassName;
  memoizedClassNames: typeof memoizedClassNames;
  classNameBuilder: typeof classNameBuilder;
  createModuleClassNames: typeof createModuleClassNames;
  clsx: typeof clsx;
  twMerge: typeof twMerge;
};

// Attach utilities to main function for convenience
(classNames as ClassNamesUtility).createVariantClassNames = createVariantClassNames;
(classNames as ClassNamesUtility).createResponsiveClassNames = createResponsiveClassNames;
(classNames as ClassNamesUtility).createBEM = createBEM;
(classNames as ClassNamesUtility).createCSSProperties = createCSSProperties;
(classNames as ClassNamesUtility).safeClassName = safeClassName;
(classNames as ClassNamesUtility).extractClassName = extractClassName;
(classNames as ClassNamesUtility).memoizedClassNames = memoizedClassNames;
(classNames as ClassNamesUtility).classNameBuilder = classNameBuilder;
(classNames as ClassNamesUtility).createModuleClassNames = createModuleClassNames;
(classNames as ClassNamesUtility).clsx = clsx;
(classNames as ClassNamesUtility).twMerge = twMerge;
