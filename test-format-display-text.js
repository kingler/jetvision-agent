// Quick test to verify formatDisplayText function works correctly
const formatDisplayText = (text, maxLength = 150) => {
  if (!text || typeof text !== 'string') return 'Untitled';

  // Remove JSON-like structures and clean up the text
  let cleanText = text
    // Remove nested JSON objects and arrays (improved pattern matching)
    .replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, ' ')
    .replace(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g, ' ')
    // Remove specific prompt patterns that appear in JetVision queries
    .replace(/["']prompt["']\s*:\s*["'][^"']*["']/gi, '')
    .replace(/As a JetVision[^,]*,?\s*/gi, '')
    // Remove markdown formatting
    .replace(/[*_`#]/g, '')
    // Remove extra whitespace and newlines
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();

  // If text is empty after cleaning, return a default
  if (!cleanText) return 'Untitled';

  // Truncate to maxLength and add ellipsis if needed
  if (cleanText.length > maxLength) {
    return cleanText.substring(0, maxLength - 3).trim() + '...';
  }

  return cleanText;
};

// Test cases that match the JSON formatting issue shown in the screenshot
const testCases = [
    // Case 1: JSON prompt format (the main issue)
    '{"prompt":"As a JetVision market intelligence specialist, search for high-value leads in the private jet charter industry"}',
    
    // Case 2: Another JSON format
    '{"prompt":"As a JetVision strategic account manager, analyze the competitive landscape"}',
    
    // Case 3: Regular text (should pass through)
    'Show me high-value leads in the private jet industry',
    
    // Case 4: Long text that needs truncation
    'This is a very long message that should be truncated because it exceeds the maximum character limit that we have set for display in the chat history sidebar component',
    
    // Case 5: Empty/null cases
    '',
    null,
    undefined
];

console.log('Testing formatDisplayText function:\n');

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}:`);
    console.log(`Input: ${JSON.stringify(testCase)}`);
    console.log(`Output: "${formatDisplayText(testCase)}"`);
    console.log(`Length: ${formatDisplayText(testCase).length} characters`);
    console.log('---');
});
