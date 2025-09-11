import React from 'react';

export interface ExamplePromptsProps {
  onPromptSelect?: (prompt: string) => void;
}

export const ExamplePrompts: React.FC<ExamplePromptsProps> = ({ onPromptSelect }) => {
  const prompts = [
    "Find executive assistants in private equity firms in New York",
    "Search for available jets from NYC to Miami next week",
    "Generate leads for C-suite executives in tech companies",
    "Check charter pricing for a light jet to Los Angeles"
  ];

  return (
    <div className="flex flex-wrap gap-2 p-4">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onPromptSelect?.(prompt)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};