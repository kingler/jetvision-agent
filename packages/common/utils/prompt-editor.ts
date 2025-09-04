/**
 * Prompt Editor Utilities
 * Handles editing and modification of chat prompts
 */

export interface EditablePrompt {
  id: string;
  originalText: string;
  editedText?: string;
  isEditing: boolean;
  timestamp: Date;
  status: 'draft' | 'submitted' | 'cancelled' | 'edited';
}

export interface PromptEditState {
  editablePrompts: Map<string, EditablePrompt>;
  currentEditingId?: string;
}

/**
 * Create a new editable prompt
 */
export function createEditablePrompt(id: string, text: string): EditablePrompt {
  return {
    id,
    originalText: text,
    isEditing: false,
    timestamp: new Date(),
    status: 'draft'
  };
}

/**
 * Start editing a prompt
 */
export function startEditingPrompt(
  prompt: EditablePrompt,
  newText?: string
): EditablePrompt {
  return {
    ...prompt,
    editedText: newText || prompt.originalText,
    isEditing: true,
    status: 'draft'
  };
}

/**
 * Save edited prompt
 */
export function saveEditedPrompt(prompt: EditablePrompt): EditablePrompt {
  return {
    ...prompt,
    isEditing: false,
    status: 'edited',
    originalText: prompt.editedText || prompt.originalText,
    editedText: undefined
  };
}

/**
 * Cancel editing a prompt
 */
export function cancelEditingPrompt(prompt: EditablePrompt): EditablePrompt {
  return {
    ...prompt,
    isEditing: false,
    status: prompt.status === 'draft' ? 'cancelled' : prompt.status,
    editedText: undefined
  };
}

/**
 * Get the current text of a prompt (edited or original)
 */
export function getCurrentPromptText(prompt: EditablePrompt): string {
  return prompt.isEditing 
    ? (prompt.editedText || prompt.originalText)
    : prompt.originalText;
}

/**
 * Check if a prompt has been modified
 */
export function isPromptModified(prompt: EditablePrompt): boolean {
  return prompt.editedText !== undefined && 
         prompt.editedText !== prompt.originalText;
}

/**
 * Validate edited prompt
 */
export function validateEditedPrompt(text: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty prompt
  if (!text.trim()) {
    errors.push('Prompt cannot be empty');
  }

  // Check for excessive length
  if (text.length > 4000) {
    errors.push('Prompt is too long (maximum 4000 characters)');
  }

  // Check for very short prompts
  if (text.trim().length < 3) {
    warnings.push('Very short prompts may not provide enough context');
  }

  // Check for potentially problematic content
  const problematicPatterns = [
    /^\s*[.!?]+\s*$/,  // Only punctuation
    /^(.)\1{10,}$/,     // Repeated characters
  ];

  problematicPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      warnings.push('Prompt may not be meaningful');
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate edit suggestions for a prompt
 */
export function generateEditSuggestions(originalText: string): string[] {
  const suggestions: string[] = [];
  
  // Length-based suggestions
  if (originalText.length < 20) {
    suggestions.push('Consider adding more context or specific details');
  }
  
  if (originalText.length > 200 && !originalText.includes('?')) {
    suggestions.push('Consider breaking this into multiple questions');
  }

  // Content-based suggestions
  if (!originalText.includes('?') && !originalText.toLowerCase().includes('please')) {
    suggestions.push('Try phrasing as a question or add "please" for clarity');
  }

  // Aviation-specific suggestions
  if (originalText.toLowerCase().includes('plane') && !originalText.toLowerCase().includes('aircraft')) {
    suggestions.push('Consider using "aircraft" for more professional aviation terminology');
  }

  if (originalText.toLowerCase().includes('cheap') || originalText.toLowerCase().includes('discount')) {
    suggestions.push('For executive aviation, consider "cost-effective" or "competitive pricing"');
  }

  return suggestions;
}

/**
 * Auto-enhance a prompt with aviation context
 */
export function enhancePromptForAviation(text: string): {
  enhancedText: string;
  changes: string[];
} {
  let enhancedText = text;
  const changes: string[] = [];

  // Replace common terms with aviation-specific ones
  const replacements: [RegExp, string, string][] = [
    [/\bplane\b/gi, 'aircraft', 'Replaced "plane" with "aircraft"'],
    [/\bflight booking\b/gi, 'charter booking', 'Enhanced to "charter booking"'],
    [/\bcheap flights?\b/gi, 'cost-effective charter options', 'Enhanced pricing language'],
    [/\bprivate plane\b/gi, 'private jet', 'Refined to "private jet"'],
  ];

  replacements.forEach(([pattern, replacement, description]) => {
    if (pattern.test(enhancedText)) {
      enhancedText = enhancedText.replace(pattern, replacement);
      changes.push(description);
    }
  });

  // Add context if aviation-related but missing key details
  const aviationKeywords = ['charter', 'jet', 'aircraft', 'aviation'];
  const hasAviationKeywords = aviationKeywords.some(keyword => 
    enhancedText.toLowerCase().includes(keyword)
  );

  if (hasAviationKeywords && enhancedText.length < 50) {
    const contextAddition = ' Please provide information specific to business aviation and executive travel services.';
    if (!enhancedText.toLowerCase().includes('business') && 
        !enhancedText.toLowerCase().includes('executive')) {
      enhancedText += contextAddition;
      changes.push('Added aviation context for better results');
    }
  }

  return {
    enhancedText,
    changes
  };
}