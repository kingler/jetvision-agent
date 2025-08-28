import moment from 'moment';
import { customAlphabet } from 'nanoid';

export const getRelativeDate = (date: string | Date) => {
  const today = moment().startOf('day');
  const inputDate = moment(date).startOf('day');

  const diffDays = today.diff(inputDate, 'days');

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return inputDate.format('DD/MM/YYYY');
};

export function formatNumber(number: number) {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(0)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(0)}K`;
  }
  return number.toString();
}

export function removeExtraSpaces(str?: string) {
  return str?.trim().replace(/\n{3,}/g, '\n\n');
}

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const convertFileToBase64 = (file: File, onChange: (base64: string) => void): void => {
  if (!file) {
    alert('Please select a file!');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event: ProgressEvent<FileReader>) => {
    const base64String = event.target?.result as string;
    onChange(base64String);
  };

  reader.onerror = (error: ProgressEvent<FileReader>) => {
    console.error('Error: ', error);
    alert('Error reading file!');
  };

  reader.readAsDataURL(file);
};

export function generateAndDownloadJson(data: any, filename: string) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Url = `data:${response.headers.get('Content-Type')};base64,${
        base64String.split(',')[1]
      }`;
      resolve(base64Url);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
}

export function generateShortUUID() {
  const nanoid = customAlphabet('1234567890abcdef', 12);
  return nanoid();
}

export const formatTickerTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formats text for display in chat history and UI components
 * - Removes JSON formatting and raw code display
 * - Truncates to specified length (default 150 characters for better readability)
 * - Cleans up whitespace and special characters
 */
export const formatDisplayText = (text: string, maxLength: number = 150): string => {
  if (!text || typeof text !== 'string') return 'Untitled';

  // Clean up JSON-like structures and extract meaningful content
  let cleanText = text;

  // Handle JSON objects with "prompt" key - extract the prompt value
  const promptMatch = text.match(/["']prompt["']\s*:\s*["']([^"']+)["']/i);
  if (promptMatch && promptMatch[1]) {
    cleanText = promptMatch[1];
  }

  // Clean up the extracted or original text
  cleanText = cleanText
    // Remove remaining JSON brackets and syntax
    .replace(/[{}[\]]/g, ' ')
    // Remove JSON key-value patterns that might remain
    .replace(/["'][^"']*["']\s*:\s*/g, ' ')
    // Remove specific JetVision prompt prefixes
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

/**
 * Formats prompt text for clean display in chat input
 * - Removes verbose instructions and technical details
 * - Keeps the core user intent
 */
export const formatPromptForDisplay = (prompt: string): string => {
  if (!prompt || typeof prompt !== 'string') return '';

  // If it's a long technical prompt, extract the core intent
  if (prompt.length > 200 && prompt.includes('As a JetVision')) {
    // Look for patterns that indicate the core user request
    const patterns = [
      /search for ([^.!?]+)/i,
      /find ([^.!?]+)/i,
      /check ([^.!?]+)/i,
      /analyze ([^.!?]+)/i,
      /generate ([^.!?]+)/i,
      /identify ([^.!?]+)/i,
      /compare ([^.!?]+)/i,
      /calculate ([^.!?]+)/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        const coreRequest = match[0].trim();
        // Capitalize first letter and ensure it's a complete thought
        return coreRequest.charAt(0).toUpperCase() + coreRequest.slice(1);
      }
    }

    // Fallback: try to extract a meaningful sentence from the beginning
    const sentences = prompt.split(/[.!?]+/);
    for (const sentence of sentences) {
      const cleanSentence = sentence.replace(/^As a JetVision[^,]+,\s*/i, '').trim();
      if (cleanSentence.length > 10 && cleanSentence.length < 100) {
        return cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
      }
    }
  }

  // For shorter prompts, just clean them up
  return prompt
    .replace(/\s+/g, ' ')
    .trim();
};
