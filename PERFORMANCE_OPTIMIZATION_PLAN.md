# JetVision Performance Optimization Plan

## Executive Summary
The application is experiencing significant performance issues due to:
1. **Extremely large bundle size** with 135+ dependencies
2. **Heavy client-side libraries** (LangChain, PDF parsing, multiple UI libraries)
3. **No code splitting or lazy loading** implemented
4. **Multiple animation libraries** running simultaneously
5. **Unoptimized build configuration**

## Critical Issues Identified

### 1. Bundle Size & Dependencies (CRITICAL)
**Problem**: The app loads 135+ dependencies on initial load including:
- **LangChain ecosystem** (7+ packages) - Not needed on client side
- **PDF parsing libraries** (pdfjs-dist, pdf-parse) - Heavy libraries loaded upfront
- **Multiple icon libraries** (@phosphor-icons, @tabler/icons, lucide-react, react-icons)
- **Multiple animation libraries** (framer-motion, embla-carousel, etc.)
- **Database libraries** (@electric-sql/pglite) loaded on client side

**Impact**: Initial bundle likely exceeds 5-10MB, causing extremely slow initial loads

### 2. React Rendering Issues
**Problems Found**:
- Multiple provider wrappers in layout.tsx causing unnecessary re-renders
- No React.memo or useMemo optimization in heavy components
- Animations running on every state change (framer-motion overuse)
- useStickToBottom hook running continuously

### 3. Build & Configuration Issues
**Problems**:
- Build timeout (>30s) indicates serious bundling issues
- Sentry integration adding overhead to every page load
- No production optimizations enabled
- Missing Next.js optimization features (Image optimization, Font optimization)

### 4. State Management
**Problems**:
- Large Zustand stores without proper slicing
- All state loaded on initial mount
- No persistence optimization

## Immediate Actions (Quick Wins)

### 1. Enable Next.js Production Optimizations
```javascript
// next.config.mjs
const nextConfig = {
  // ... existing config
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable modularizeImports for large libraries
  modularizeImports: {
    '@tabler/icons-react': {
      transform: '@tabler/icons-react/dist/esm/icons/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'react-icons': {
      transform: 'react-icons/{{dirname}}/index.js',
    },
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    // ... existing config
  },
};
```

### 2. Implement Code Splitting & Dynamic Imports
```typescript
// Replace heavy imports with dynamic imports
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  loading: () => <div>Loading PDF viewer...</div>,
  ssr: false,
});

const LangChainProcessor = dynamic(() => import('@/lib/langchain'), {
  ssr: false,
});
```

### 3. Remove Unnecessary Dependencies
**Remove or lazy load**:
- Move LangChain to server-side only (API routes)
- Lazy load PDF libraries only when needed
- Consolidate to single icon library (recommend lucide-react only)
- Remove unused dependencies (install, npm, yarn in package.json)

### 4. Optimize Component Rendering
```typescript
// Add memo to heavy components
export const ChatInput = memo(forwardRef<ChatInputRef, Props>(...));

// Use useMemo for expensive computations
const expensiveValue = useMemo(() => computeExpensiveValue(deps), [deps]);
```

## Phase 1: Bundle Optimization (Week 1)

### Day 1-2: Dependency Audit & Removal
- [ ] Audit all 135 dependencies for usage
- [ ] Remove unused dependencies
- [ ] Move server-only deps to devDependencies
- [ ] Consolidate duplicate functionality libraries

### Day 3-4: Code Splitting Implementation
- [ ] Implement route-based code splitting
- [ ] Dynamic import heavy components
- [ ] Lazy load PDF and chart libraries
- [ ] Split vendor bundles

### Day 5: Build Optimization
- [ ] Configure webpack optimization
- [ ] Enable tree shaking
- [ ] Implement bundle analyzer
- [ ] Set up compression

## Phase 2: Runtime Optimization (Week 2)

### Day 1-2: React Performance
- [ ] Implement React.memo on all list items
- [ ] Add useMemo/useCallback where needed
- [ ] Virtualize long lists
- [ ] Optimize re-renders with React DevTools

### Day 3-4: Animation & UI Optimization
- [ ] Reduce framer-motion animations
- [ ] Use CSS transitions for simple animations
- [ ] Implement intersection observer for lazy rendering
- [ ] Optimize image loading with Next/Image

### Day 5: State Management
- [ ] Implement state slicing in Zustand
- [ ] Add persistence with IndexedDB
- [ ] Optimize state updates
- [ ] Implement selective subscriptions

## Phase 3: Infrastructure (Week 3)

### Day 1-2: API Optimization
- [ ] Implement API response caching
- [ ] Add request deduplication
- [ ] Optimize MCP proxy performance
- [ ] Implement proper error boundaries

### Day 3-4: CDN & Edge Optimization
- [ ] Configure CDN for static assets
- [ ] Implement edge caching
- [ ] Optimize font loading
- [ ] Set up service worker for offline support

### Day 5: Monitoring & Metrics
- [ ] Set up performance monitoring
- [ ] Implement Core Web Vitals tracking
- [ ] Add bundle size monitoring
- [ ] Create performance dashboard

## Immediate Implementation Script

Create `optimize.sh`:
```bash
#!/bin/bash

# Remove unused dependencies
bun remove install npm yarn

# Add bundle analyzer
bun add -D @next/bundle-analyzer webpack-bundle-analyzer

# Add performance monitoring
bun add web-vitals

# Clean and rebuild
bun run clean
bun install
bun run build --profile
```

## Expected Results

### After Phase 1:
- Initial bundle size reduced by 60-70%
- Page load time improved by 3-5 seconds
- Build time reduced to under 60 seconds

### After Phase 2:
- Time to Interactive (TTI) < 3 seconds
- First Contentful Paint (FCP) < 1.5 seconds
- Smooth interactions with no jank

### After Phase 3:
- Lighthouse score > 90
- Core Web Vitals in green
- Consistent sub-second response times

## Monitoring Metrics

Track these metrics before and after optimization:
- Bundle size (target: < 500KB initial)
- Time to Interactive (target: < 3s)
- First Contentful Paint (target: < 1.5s)
- Largest Contentful Paint (target: < 2.5s)
- Build time (target: < 60s)
- Memory usage (target: < 100MB)

## Quick Start Commands

```bash
# Analyze current bundle
ANALYZE=true bun run build

# Profile build performance
bun run build --profile

# Check for unused dependencies
bunx depcheck

# Find large modules
bunx bundle-buddy
```

## Priority Action Items

1. **TODAY**: Remove/lazy load LangChain and PDF libraries
2. **TODAY**: Consolidate icon libraries to just lucide-react
3. **TOMORROW**: Implement dynamic imports for heavy components
4. **THIS WEEK**: Set up bundle analyzer and monitoring
5. **THIS WEEK**: Configure Next.js optimizations

## Notes for Developers

- Always use dynamic imports for components > 50KB
- Prefer CSS animations over JavaScript animations
- Use React DevTools Profiler before committing
- Monitor bundle size in CI/CD pipeline
- Document any new heavy dependencies