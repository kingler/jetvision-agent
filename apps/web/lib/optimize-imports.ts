// Utility for optimized imports
export const importWhenVisible = async (
  importFn: () => Promise<any>,
  element: HTMLElement | null,
  rootMargin = '100px'
) => {
  if (!element || typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          importFn().then(resolve);
        }
      },
      { rootMargin }
    );

    observer.observe(element);
  });
};

// React hook for lazy loading
import { useEffect, useRef, useState } from 'react';

export function useLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  options = { rootMargin: '100px' }
) {
  const [Component, setComponent] = useState<T | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          const { default: LoadedComponent } = await importFn();
          setComponent(() => LoadedComponent);
        }
      },
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return { Component, ref };
}