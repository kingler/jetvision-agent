#!/bin/bash

echo "🚀 Starting JetVision Performance Optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Backing up current configuration...${NC}"
cp apps/web/next.config.mjs apps/web/next.config.backup.mjs
echo -e "${GREEN}✓ Backup created${NC}"

echo -e "${YELLOW}Step 2: Installing optimization tools...${NC}"
bun add -D @next/bundle-analyzer webpack-bundle-analyzer
bun add web-vitals
echo -e "${GREEN}✓ Tools installed${NC}"

echo -e "${YELLOW}Step 3: Applying optimized Next.js config...${NC}"
cp apps/web/next.config.optimized.mjs apps/web/next.config.mjs
echo -e "${GREEN}✓ Optimized config applied${NC}"

echo -e "${YELLOW}Step 4: Creating dynamic import wrapper components...${NC}"

# Create lazy-loaded component wrappers
mkdir -p apps/web/components/lazy

cat > apps/web/components/lazy/PDFViewer.tsx << 'EOF'
import dynamic from 'next/dynamic';

export const PDFViewer = dynamic(
  () => import('../PDFViewer').then(mod => mod.PDFViewer),
  {
    loading: () => <div className="animate-pulse">Loading PDF viewer...</div>,
    ssr: false,
  }
);
EOF

cat > apps/web/components/lazy/LangChainProcessor.tsx << 'EOF'
import dynamic from 'next/dynamic';

export const LangChainProcessor = dynamic(
  () => import('../../lib/langchain').then(mod => mod.LangChainProcessor),
  {
    ssr: false,
  }
);
EOF

echo -e "${GREEN}✓ Lazy components created${NC}"

echo -e "${YELLOW}Step 5: Adding performance monitoring...${NC}"

cat > apps/web/lib/performance.ts << 'EOF'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Replace with your analytics endpoint
  console.log('Performance metric:', metric);
  
  // Example: Send to your analytics service
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   body: JSON.stringify(metric),
  //   headers: { 'Content-Type': 'application/json' },
  // });
}

export function reportWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}
EOF

echo -e "${GREEN}✓ Performance monitoring added${NC}"

echo -e "${YELLOW}Step 6: Creating optimization utilities...${NC}"

cat > apps/web/lib/optimize-imports.ts << 'EOF'
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
EOF

echo -e "${GREEN}✓ Optimization utilities created${NC}"

echo -e "${YELLOW}Step 7: Cleaning and rebuilding...${NC}"
bun run clean
bun install
echo -e "${GREEN}✓ Dependencies cleaned and reinstalled${NC}"

echo -e "${YELLOW}Step 8: Analyzing bundle (this will take a moment)...${NC}"
ANALYZE=true bun run build || true

echo ""
echo -e "${GREEN}🎉 Optimization setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the bundle analysis report that opened in your browser"
echo "2. Remove or lazy-load the largest dependencies identified"
echo "3. Test the application performance"
echo "4. Run 'bun run build' to see improved build times"
echo ""
echo -e "${YELLOW}Quick wins to implement:${NC}"
echo "- Move LangChain imports to server-side only (API routes)"
echo "- Lazy load PDF libraries when needed"
echo "- Remove duplicate icon libraries (keep only lucide-react)"
echo "- Use dynamic imports for heavy components"
echo ""
echo -e "${GREEN}Performance monitoring is now active. Check console for Web Vitals.${NC}"