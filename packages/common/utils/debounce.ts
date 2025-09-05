/**
 * Debounce utility to prevent rapid function calls
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Request deduplication utility to prevent duplicate API calls
 * @param keyFn Function to generate unique key for request
 * @param timeWindow Time window in ms to deduplicate requests
 * @returns Decorated function that prevents duplicates
 */
export const deduplicate = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  timeWindow: number = 1000
): ((...args: Parameters<T>) => Promise<any>) => {
  const activeRequests = new Map<string, Promise<any>>();
  const requestTimestamps = new Map<string, number>();

  return async (...args: Parameters<T>): Promise<any> => {
    const key = keyFn(...args);
    const now = Date.now();
    
    // Clean up old timestamps
    for (const [reqKey, timestamp] of Array.from(requestTimestamps.entries())) {
      if (now - timestamp > timeWindow) {
        requestTimestamps.delete(reqKey);
        activeRequests.delete(reqKey);
      }
    }

    // Return existing request if within time window
    if (activeRequests.has(key)) {
      return activeRequests.get(key);
    }

    // Create new request
    const request = fn(...args);
    activeRequests.set(key, request);
    requestTimestamps.set(key, now);

    // Clean up after completion
    request.finally(() => {
      setTimeout(() => {
        activeRequests.delete(key);
        requestTimestamps.delete(key);
      }, timeWindow);
    });

    return request;
  };
};

/**
 * Batch state updates to reduce re-renders
 * @param updates Array of state update functions
 * @param delay Delay before executing batch (default: 16ms for ~60fps)
 */
export const batchStateUpdates = (
  updates: (() => void)[],
  delay: number = 16
): void => {
  // Use requestAnimationFrame for better performance
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  } else {
    setTimeout(() => {
      updates.forEach(update => update());
    }, delay);
  }
};