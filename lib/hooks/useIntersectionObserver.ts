import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
  threshold?: number | number[];
  root?: Element | Document | null;
  rootMargin?: string;
  enabled?: boolean;
}

export interface UseIntersectionObserverResult {
  ref: React.RefObject<Element>;
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
  observer?: IntersectionObserver;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    triggerOnce = false,
    threshold = 0,
    root = null,
    rootMargin = '0px',
    enabled = true,
  } = options;

  const ref = useRef<Element>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      setEntry(entry);
      setIsIntersecting(entry.isIntersecting);
      
      if (entry.isIntersecting && triggerOnce) {
        observerRef.current?.disconnect();
      }
    },
    [triggerOnce]
  );

  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold,
      root,
      rootMargin,
    });

    const element = ref.current;
    if (element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, threshold, root, rootMargin, handleIntersect]);

  return {
    ref,
    isIntersecting,
    entry,
    observer: observerRef.current,
  };
}

export function useLazyLoad(
  options: UseIntersectionObserverOptions & {
    placeholder?: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    placeholder,
    onLoad,
    onError,
    ...observerOptions
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver(observerOptions);

  useEffect(() => {
    if (isIntersecting && !isLoaded && !hasError) {
      const element = ref.current as HTMLImageElement;
      
      if (element && element.dataset.src) {
        const img = new Image();
        
        img.onload = () => {
          element.src = img.src;
          setIsLoaded(true);
          onLoad?.();
        };
        
        img.onerror = (error) => {
          setHasError(true);
          onError?.(new Error('Failed to load image'));
        };
        
        img.src = element.dataset.src;
      }
    }
  }, [isIntersecting, isLoaded, hasError, ref, onLoad, onError]);

  return {
    ref,
    isLoaded,
    hasError,
    isVisible: isIntersecting,
    placeholder,
  };
}

export function useInfiniteScroll(
  callback: () => void | Promise<void>,
  options: UseIntersectionObserverOptions & {
    hasMore: boolean;
    isLoading: boolean;
    rootMargin?: string;
  }
) {
  const {
    hasMore,
    isLoading,
    rootMargin = '100px',
    ...observerOptions
  } = options;

  const { ref, isIntersecting } = useIntersectionObserver({
    ...observerOptions,
    rootMargin,
    enabled: hasMore && !isLoading,
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      Promise.resolve(callback()).catch(console.error);
    }
  }, [isIntersecting, hasMore, isLoading, callback]);

  return {
    ref,
    isIntersecting,
    isLoading,
    hasMore,
  };
}

export function useVisibilityChange(
  callback: (isVisible: boolean, entry: IntersectionObserverEntry) => void,
  options: UseIntersectionObserverOptions = {}
) {
  const { ref, isIntersecting, entry } = useIntersectionObserver(options);

  useEffect(() => {
    if (entry) {
      callback(isIntersecting, entry);
    }
  }, [isIntersecting, entry, callback]);

  return ref;
}

export function useStickyHeader(
  options: UseIntersectionObserverOptions & {
    offset?: number;
    stickyClass?: string;
  } = {}
) {
  const {
    offset = 0,
    stickyClass = 'sticky',
    ...observerOptions
  } = options;

  const { ref, isIntersecting } = useIntersectionObserver({
    ...observerOptions,
    rootMargin: `-${offset}px 0px 0px 0px`,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!isIntersecting) {
      element.classList.add(stickyClass);
    } else {
      element.classList.remove(stickyClass);
    }
  }, [isIntersecting, ref, stickyClass]);

  return {
    ref,
    isSticky: !isIntersecting,
  };
}

export function useScrollSpy(
  sectionIds: string[],
  options: UseIntersectionObserverOptions & {
    offset?: number;
    activeClass?: string;
  } = {}
) {
  const {
    offset = 0,
    activeClass = 'active',
    ...observerOptions
  } = options;

  const [activeSection, setActiveSection] = useState<string>('');
  const observersRef = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    // Clean up previous observers
    observersRef.current.forEach(observer => observer.disconnect());
    observersRef.current = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    // Create observer for each section
    sectionIds.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(handleIntersect, {
        ...observerOptions,
        rootMargin: `-${offset}px 0px -${offset}px 0px`,
      });

      observer.observe(element);
      observersRef.current.push(observer);
    });

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
    };
  }, [sectionIds, offset, observerOptions]);

  // Update nav links
  useEffect(() => {
    sectionIds.forEach(sectionId => {
      const navLink = document.querySelector(`a[href="#${sectionId}"]`);
      if (!navLink) return;

      if (sectionId === activeSection) {
        navLink.classList.add(activeClass);
      } else {
        navLink.classList.remove(activeClass);
      }
    });
  }, [activeSection, sectionIds, activeClass]);

  return {
    activeSection,
    setActiveSection,
  };
}

export function useViewportTracker(
  callback: (entry: IntersectionObserverEntry) => void,
  options: UseIntersectionObserverOptions = {}
) {
  const { ref, entry } = useIntersectionObserver({
    ...options,
    threshold: Array.from({ length: 101 }, (_, i) => i / 100),
  });

  useEffect(() => {
    if (entry) {
      callback(entry);
    }
  }, [entry, callback]);

  return ref;
}

export function useElementVisibility(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [visibilityRatio, setVisibilityRatio] = useState(0);

  useEffect(() => {
    if (!elementRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
        setVisibilityRatio(entry.intersectionRatio);
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        ...options,
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return {
    isVisible,
    visibilityRatio,
  };
}

export function useIntersectionCounter(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
) {
  const [intersectionCount, setIntersectionCount] = useState(0);

  const { ref, isIntersecting } = useIntersectionObserver({
    ...options,
    triggerOnce: false,
  });

  // Combine refs
  const combinedRef = useCallback(
    (element: Element | null) => {
      // @ts-ignore
      ref.current = element;
      if (elementRef) {
        // @ts-ignore
        elementRef.current = element;
      }
    },
    [ref, elementRef]
  );

  useEffect(() => {
    if (isIntersecting) {
      setIntersectionCount(prev => prev + 1);
    }
  }, [isIntersecting]);

  return {
    ref: combinedRef,
    intersectionCount,
    isIntersecting,
  };
}

export function useScrollProgress(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
) {
  const [progress, setProgress] = useState(0);

  const { entry } = useIntersectionObserver({
    ...options,
    threshold: Array.from({ length: 101 }, (_, i) => i / 100),
  });

  useEffect(() => {
    if (entry) {
      const rect = entry.boundingClientRect;
      const viewportHeight = window.innerHeight;
      
      // Calculate how much of the element is visible
      const visibleHeight = Math.min(
        rect.bottom,
        viewportHeight
      ) - Math.max(rect.top, 0);
      
      const progress = Math.max(0, Math.min(1, visibleHeight / rect.height));
      setProgress(progress);
    }
  }, [entry]);

  return {
    ref: elementRef,
    progress,
    entry,
  };
}

// Higher-order component for intersection observer
export function withIntersectionObserver<P extends object>(
  WrappedComponent: React.ComponentType<P & UseIntersectionObserverResult>,
  options: UseIntersectionObserverOptions = {}
) {
  return function WithIntersectionObserver(props: P) {
    const observerResult = useIntersectionObserver(options);
    return <WrappedComponent {...props} {...observerResult} />;
  };
}
