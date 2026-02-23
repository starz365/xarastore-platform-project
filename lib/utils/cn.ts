import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * This provides better type safety and prevents class conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Conditional class merging helper
 * Returns classes based on conditions
 */
export function classNames(
  ...classes: Array<string | boolean | undefined | null>
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Creates a BEM (Block Element Modifier) class name generator
 */
export function bem(block: string) {
  return {
    block: () => block,
    element: (element: string) => `${block}__${element}`,
    modifier: (modifier: string) => `${block}--${modifier}`,
    elementModifier: (element: string, modifier: string) => 
      `${block}__${element}--${modifier}`,
  };
}

/**
 * Generates responsive class variants based on breakpoints
 */
export function responsiveClasses(
  base: string,
  variants: Record<string, string> = {}
): string {
  const responsive = Object.entries(variants)
    .map(([breakpoint, className]) => {
      if (breakpoint === 'default') return className;
      return `${breakpoint}:${className}`;
    })
    .join(' ');

  return cn(base, responsive);
}

/**
 * Generates theme-aware class names
 */
export function themeClasses(
  light: string,
  dark: string,
  system: string = ''
): string {
  return cn(
    light,
    `dark:${dark}`,
    system && `[theme=system]:${system}`
  );
}

/**
 * Animation class utilities
 */
export const animations = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  slideLeft: 'animate-slide-left',
  slideRight: 'animate-slide-right',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  ping: 'animate-ping',
};

/**
 * Transition duration utilities
 */
export const durations = {
  fastest: 'duration-75',
  faster: 'duration-100',
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  slower: 'duration-500',
  slowest: 'duration-700',
};

/**
 * Delay utilities
 */
export const delays = {
  none: 'delay-0',
  short: 'delay-75',
  medium: 'delay-150',
  long: 'delay-300',
  longer: 'delay-500',
};

/**
 * Easing function utilities
 */
export const easings = {
  linear: 'ease-linear',
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
  bounce: 'ease-bounce',
  spring: 'ease-spring',
};

/**
 * Creates a CSS custom property (CSS variable)
 */
export function cssVar(name: string, value?: string): string {
  if (value) {
    return `--${name}: ${value};`;
  }
  return `var(--${name})`;
}

/**
 * Generates a CSS clamp value for responsive typography
 */
export function fluidClamp(
  minSize: number,
  maxSize: number,
  minViewport: number = 320,
  maxViewport: number = 1920
): string {
  const minSizeRem = minSize / 16;
  const maxSizeRem = maxSize / 16;
  const minViewportRem = minViewport / 16;
  const maxViewportRem = maxViewport / 16;

  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const yIntersection = -minViewport * slope + minSize;

  return `clamp(${minSizeRem}rem, ${yIntersection.toFixed(2)}px + ${(slope * 100).toFixed(2)}vw, ${maxSizeRem}rem)`;
}

/**
 * Accessibility utilities for screen readers
 */
export const srOnly = 'sr-only';
export const notSrOnly = 'not-sr-only';

/**
 * Focus utilities for better accessibility
 */
export const focus = {
  visible: 'focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2',
  ring: 'focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
  none: 'focus:outline-none',
};

/**
 * Creates a gradient class with proper vendor prefixes
 */
export function gradient(
  direction: 'to-t' | 'to-tr' | 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' = 'to-r',
  from: string,
  via: string = '',
  to: string
): string {
  const gradientClasses = [`bg-gradient-${direction}`, `from-${from}`, `to-${to}`];
  if (via) {
    gradientClasses.splice(2, 0, `via-${via}`);
  }
  return gradientClasses.join(' ');
}

/**
 * Creates a shadow utility with proper depth levels
 */
export function shadow(level: 0 | 1 | 2 | 3 | 4 | 5 = 2): string {
  const shadows = [
    'shadow-none',
    'shadow-elevation-1',
    'shadow-elevation-2',
    'shadow-elevation-3',
    'shadow-lg',
    'shadow-xl',
  ];
  return shadows[level] || shadows[2];
}

/**
 * Creates a border radius utility with consistent scale
 */
export function borderRadius(
  size: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' = 'md'
): string {
  const radii = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  };
  return radii[size] || radii.md;
}

/**
 * Creates spacing utilities with consistent scale
 */
export function spacing(
  type: 'p' | 'm' | 'pt' | 'pr' | 'pb' | 'pl' | 'px' | 'py' | 'mt' | 'mr' | 'mb' | 'ml' | 'mx' | 'my',
  size: 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 16 | 20 | 24 | 28 | 32 | 36 | 40 | 44 | 48 | 52 | 56 | 60 | 64 | 72 | 80 | 96 = 4
): string {
  const sizes = {
    0: '0',
    0.5: '0.5',
    1: '1',
    1.5: '1.5',
    2: '2',
    2.5: '2.5',
    3: '3',
    3.5: '3.5',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: '11',
    12: '12',
    14: '14',
    16: '16',
    20: '20',
    24: '24',
    28: '28',
    32: '32',
    36: '36',
    40: '40',
    44: '44',
    48: '48',
    52: '52',
    56: '56',
    60: '60',
    64: '64',
    72: '72',
    80: '80',
    96: '96',
  };
  return `${type}-${sizes[size] || sizes[4]}`;
}

/**
 * Creates typography utilities with consistent scale
 */
export function typography(
  type: 'text' | 'font' | 'leading' | 'tracking',
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl' | 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose' | 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest'
): string {
  const prefixes = {
    text: 'text',
    font: 'font',
    leading: 'leading',
    tracking: 'tracking',
  };
  return `${prefixes[type]}-${size}`;
}
