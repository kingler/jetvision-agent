import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

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
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // INP replaced FID in web-vitals v3+
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}