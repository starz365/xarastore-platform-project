// Re-export all utility functions
export * from './cn';
export * from './currency';
export * from './classNames';
export * from './formatters';
export * from './validators';
export * from './offline';
export * from './performance';
export * from './security';
export * from './date';
export * from './url';

// Utility type definitions
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Primitive = string | number | boolean | null | undefined;
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
export type ValueOf<T> = T[keyof T];
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];

// Utility functions that don't belong in specific modules
export function noop(): void {
  // Empty function for placeholder callbacks
}

export function identity<T>(value: T): T {
  return value;
}

export function constant<T>(value: T): () => T {
  return () => value;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function isNotEmpty<T>(value: T): boolean {
  return !isEmpty(value);
}

export function coalesce<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (isDefined(value)) {
      return value;
    }
  }
  return undefined;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null;
  return function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const output = { ...target } as T & U;
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key as keyof U])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key as keyof U] });
        } else {
          output[key as keyof T & U] = deepMerge(
            target[key as keyof T] as any,
            source[key as keyof U] as any
          ) as any;
        }
      } else {
        Object.assign(output, { [key]: source[key as keyof U] });
      }
    });
  }
  
  return output;
}

function isObject(item: unknown): item is Record<string, any> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

export function set<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): T {
  return { ...obj, [key]: value };
}

export function update<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  updater: (value: T[K]) => T[K]
): T {
  return { ...obj, [key]: updater(obj[key]) };
}

export function partition<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  array.forEach((item, index) => {
    if (predicate(item, index, array)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  });
  return [truthy, falsy];
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    if (keyA < keyB) return order === 'asc' ? -1 : 1;
    if (keyA > keyB) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, item) => 
    acc.concat(Array.isArray(item) ? flatten(item) : item), 
  []);
}

export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

export function sample<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function camelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

export function snakeCase(str: string): string {
  return str.replace(/\s+/g, '_').toLowerCase();
}

export function kebabCase(str: string): string {
  return str.replace(/\s+/g, '-').toLowerCase();
}

export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

export function unescapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
  };
  return str.replace(/&(amp|lt|gt|quot|#039|#x27|#x2F);/g, m => map[m]);
}

export function generateId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export function round(value: number, precision: number = 0): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-KE', options).format(value);
}

export function parseNumber(str: string): number {
  const num = parseFloat(str.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function isNumeric(value: unknown): value is number | string {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      fn()
        .then(resolve)
        .catch(error => {
          if (retryCount <= 0) {
            reject(error);
            return;
          }
          setTimeout(() => attempt(retryCount - 1), delay * (retries - retryCount + 1));
        });
    };
    attempt(retries);
  });
}

export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

export function createEventEmitter<T extends Record<string, any>>() {
  const listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};
  
  return {
    on<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event]!.push(listener);
      return () => this.off(event, listener);
    },
    
    off<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
      if (!listeners[event]) return;
      const index = listeners[event]!.indexOf(listener);
      if (index > -1) {
        listeners[event]!.splice(index, 1);
      }
    },
    
    emit<K extends keyof T>(event: K, data: T[K]) {
      if (!listeners[event]) return;
      listeners[event]!.forEach(listener => listener(data));
    },
    
    once<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
      const onceListener = (data: T[K]) => {
        listener(data);
        this.off(event, onceListener);
      };
      this.on(event, onceListener);
    },
  };
}

export function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<() => void>();
  
  return {
    getState() {
      return state;
    },
    
    setState(newState: T | ((prevState: T) => T)) {
      state = typeof newState === 'function' ? (newState as (prevState: T) => T)(state) : newState;
      listeners.forEach(listener => listener());
    },
    
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    
    select<R>(selector: (state: T) => R) {
      return selector(state);
    },
  };
}

export function compose(...fns: Array<(arg: any) => any>) {
  return (x: any) => fns.reduceRight((acc, fn) => fn(acc), x);
}

export function pipe(...fns: Array<(arg: any) => any>) {
  return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
}

export function curry<T extends any[], R>(
  fn: (...args: T) => R,
  arity: number = fn.length
): (...args: any[]) => any {
  return function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn(...args as any);
    }
    return (...moreArgs: any[]) => curried(...args, ...moreArgs);
  };
}

export function partial<T extends any[], R>(
  fn: (...args: T) => R,
  ...partialArgs: any[]
): (...args: any[]) => R {
  return (...args: any[]) => fn(...partialArgs, ...args);
}

export function memoizeOne<T extends (...args: any[]) => any>(fn: T): T {
  let lastArgs: any[] | null = null;
  let lastResult: any;
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    if (lastArgs && args.length === lastArgs.length && 
        args.every((arg, i) => arg === lastArgs![i])) {
      return lastResult;
    }
    
    lastArgs = args;
    lastResult = fn.apply(this, args);
    return lastResult;
  } as T;
}

export function createLazy<T>(factory: () => T): () => T {
  let value: T | undefined;
  let initialized = false;
  
  return () => {
    if (!initialized) {
      value = factory();
      initialized = true;
    }
    return value!;
  };
}

export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;
  
  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label: string = 'Operation'
): (...args: Parameters<T>) => ReturnType<T> {
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const start = performance.now();
    const result = fn.apply(this, args);
    const end = performance.now();
    console.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

export function createDebouncedQueue(
  process: (items: any[]) => void,
  delay: number = 1000
) {
  let queue: any[] = [];
  let timer: NodeJS.Timeout | null = null;
  
  return {
    add(item: any) {
      queue.push(item);
      
      if (timer) {
        clearTimeout(timer);
      }
      
      timer = setTimeout(() => {
        process([...queue]);
        queue = [];
        timer = null;
      }, delay);
    },
    
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (queue.length > 0) {
        process([...queue]);
        queue = [];
      }
    },
    
    clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      queue = [];
    },
  };
}

export function createThrottledQueue(
  process: (items: any[]) => void,
  limit: number = 1000
) {
  let queue: any[] = [];
  let processing = false;
  
  return {
    add(item: any) {
      queue.push(item);
      this.process();
    },
    
    process() {
      if (processing || queue.length === 0) return;
      
      processing = true;
      const items = queue.splice(0, limit);
      
      process(items);
      
      setTimeout(() => {
        processing = false;
        this.process();
      }, 1000);
    },
  };
}

export function createPromisePool<T, R>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 5,
  processor: (task: () => Promise<T>) => Promise<R> = async (task) => task() as any
): Promise<R[]> {
  return new Promise((resolve, reject) => {
    const results: R[] = [];
    let index = 0;
    let running = 0;
    let completed = 0;
    let hasError = false;
    
    function runNext() {
      if (hasError) return;
      if (completed === tasks.length) {
        resolve(results);
        return;
      }
      
      while (running < concurrency && index < tasks.length) {
        const currentIndex = index++;
        running++;
        
        processor(tasks[currentIndex])
          .then(result => {
            results[currentIndex] = result;
          })
          .catch(error => {
            hasError = true;
            reject(error);
          })
          .finally(() => {
            running--;
            completed++;
            runNext();
          });
      }
    }
    
    runNext();
  });
}

export function createAbortablePromise<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };
    
    if (signal.aborted) {
      onAbort();
      return;
    }
    
    signal.addEventListener('abort', onAbort);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
}

export function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: boolean;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = () => true,
  } = options;
  
  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      fn()
        .then(resolve)
        .catch(error => {
          if (retryCount <= 0 || !shouldRetry(error)) {
            reject(error);
            return;
          }
          
          const waitTime = backoff ? delay * (retries - retryCount + 1) : delay;
          setTimeout(() => attempt(retryCount - 1), waitTime);
        });
    };
    
    attempt(retries);
  });
}

export function createCache<T>(options: {
  maxAge?: number;
  maxSize?: number;
} = {}) {
  const { maxAge = 5 * 60 * 1000, maxSize = 100 } = options;
  const cache = new Map<string, { value: T; timestamp: number }>();
  
  return {
    set(key: string, value: T) {
      this.cleanup();
      
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      
      cache.set(key, { value, timestamp: Date.now() });
    },
    
    get(key: string): T | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      
      if (Date.now() - entry.timestamp > maxAge) {
        cache.delete(key);
        return undefined;
      }
      
      return entry.value;
    },
    
    has(key: string): boolean {
      return this.get(key) !== undefined;
    },
    
    delete(key: string) {
      cache.delete(key);
    },
    
    clear() {
      cache.clear();
    },
    
    keys(): string[] {
      return Array.from(cache.keys());
    },
    
    values(): T[] {
      return Array.from(cache.values()).map(entry => entry.value);
    },
    
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > maxAge) {
          cache.delete(key);
        }
      }
    },
  };
}

export function createLRUCache<T>(capacity: number = 100) {
  const cache = new Map<string, T>();
  
  return {
    get(key: string): T | undefined {
      if (!cache.has(key)) return undefined;
      
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      
      return value;
    },
    
    set(key: string, value: T) {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= capacity) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, value);
    },
    
    has(key: string): boolean {
      return cache.has(key);
    },
    
    delete(key: string) {
      cache.delete(key);
    },
    
    clear() {
      cache.clear();
    },
    
    size(): number {
      return cache.size;
    },
  };
}
