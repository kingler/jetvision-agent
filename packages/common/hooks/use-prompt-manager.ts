'use client';

import { useState, useCallback, useEffect } from 'react';
import { PromptCard, STATIC_PROMPTS_DATA } from '../utils/prompts-parser';

interface CustomPromptCard extends Omit<PromptCard, 'id'> {
    id: string;
    isCustom: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UsePromptManagerReturn {
    prompts: CustomPromptCard[];
    loading: boolean;
    error: string | null;
    createPrompt: (
        title: string,
        prompt: string,
        fullPrompt: string,
        description: string
    ) => Promise<void>;
    updatePrompt: (
        id: string,
        title: string,
        prompt: string,
        fullPrompt: string,
        description: string
    ) => Promise<void>;
    deletePrompt: (id: string) => Promise<void>;
    duplicatePrompt: (id: string) => Promise<void>;
    createCustomCopy: (id: string) => Promise<string>; // Returns the new custom prompt ID
    getPromptById: (id: string) => CustomPromptCard | undefined;
}

const STORAGE_KEY = 'jetvision_custom_prompts';

// Generate unique ID for new prompts
const generateId = (): string => {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert static prompts to the enhanced format
const convertStaticPrompts = (): CustomPromptCard[] => {
    return STATIC_PROMPTS_DATA.flatMap(category =>
        category.prompts.map(prompt => ({
            ...prompt,
            isCustom: false,
            createdAt: '2024-01-01T00:00:00.000Z', // Default date for static prompts
            updatedAt: '2024-01-01T00:00:00.000Z',
        }))
    );
};

export const usePromptManager = (): UsePromptManagerReturn => {
    const [customPrompts, setCustomPrompts] = useState<CustomPromptCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load custom prompts from localStorage on mount
    useEffect(() => {
        const loadCustomPrompts = () => {
            try {
                setLoading(true);
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setCustomPrompts(Array.isArray(parsed) ? parsed : []);
                }
            } catch (err) {
                console.error('Failed to load custom prompts:', err);
                setError('Failed to load custom prompts');
            } finally {
                setLoading(false);
            }
        };

        loadCustomPrompts();
    }, []);

    // Save custom prompts to localStorage
    const saveToStorage = useCallback((prompts: CustomPromptCard[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
        } catch (err) {
            console.error('Failed to save custom prompts:', err);
            setError('Failed to save custom prompts');
        }
    }, []);

    // Get all prompts (static + custom)
    const prompts = useCallback(() => {
        const staticPrompts = convertStaticPrompts();
        return [...staticPrompts, ...customPrompts];
    }, [customPrompts])();

    // Create a new prompt
    const createPrompt = useCallback(
        async (
            title: string,
            prompt: string,
            fullPrompt: string,
            description: string
        ): Promise<void> => {
            try {
                setError(null);
                const now = new Date().toISOString();
                const newPrompt: CustomPromptCard = {
                    id: generateId(),
                    category: 'Custom',
                    title,
                    prompt,
                    fullPrompt,
                    description,
                    isCustom: true,
                    createdAt: now,
                    updatedAt: now,
                };

                const updatedPrompts = [...customPrompts, newPrompt];
                setCustomPrompts(updatedPrompts);
                saveToStorage(updatedPrompts);
            } catch (err) {
                console.error('Failed to create prompt:', err);
                setError('Failed to create prompt');
                throw err;
            }
        },
        [customPrompts, saveToStorage]
    );

    // Update an existing prompt
    const updatePrompt = useCallback(
        async (
            id: string,
            title: string,
            prompt: string,
            fullPrompt: string,
            description: string
        ): Promise<void> => {
            try {
                setError(null);
                const existingPrompt = customPrompts.find(p => p.id === id);

                if (!existingPrompt) {
                    throw new Error('Prompt not found or cannot be edited');
                }

                if (!existingPrompt.isCustom) {
                    throw new Error('Static prompts cannot be edited');
                }

                const updatedPrompts = customPrompts.map(p =>
                    p.id === id
                        ? {
                              ...p,
                              title,
                              prompt,
                              fullPrompt,
                              description,
                              updatedAt: new Date().toISOString(),
                          }
                        : p
                );

                setCustomPrompts(updatedPrompts);
                saveToStorage(updatedPrompts);
            } catch (err) {
                console.error('Failed to update prompt:', err);
                setError('Failed to update prompt');
                throw err;
            }
        },
        [customPrompts, saveToStorage]
    );

    // Delete a prompt
    const deletePrompt = useCallback(
        async (id: string): Promise<void> => {
            try {
                setError(null);
                const existingPrompt = customPrompts.find(p => p.id === id);

                if (!existingPrompt) {
                    throw new Error('Prompt not found');
                }

                if (!existingPrompt.isCustom) {
                    throw new Error('Static prompts cannot be deleted');
                }

                const updatedPrompts = customPrompts.filter(p => p.id !== id);
                setCustomPrompts(updatedPrompts);
                saveToStorage(updatedPrompts);
            } catch (err) {
                console.error('Failed to delete prompt:', err);
                setError('Failed to delete prompt');
                throw err;
            }
        },
        [customPrompts, saveToStorage]
    );

    // Duplicate a prompt
    const duplicatePrompt = useCallback(
        async (id: string): Promise<void> => {
            try {
                setError(null);
                const existingPrompt = prompts.find(p => p.id === id);

                if (!existingPrompt) {
                    throw new Error('Prompt not found');
                }

                const now = new Date().toISOString();
                const duplicatedPrompt: CustomPromptCard = {
                    ...existingPrompt,
                    id: generateId(),
                    title: `${existingPrompt.title} (Copy)`,
                    isCustom: true,
                    createdAt: now,
                    updatedAt: now,
                };

                const updatedPrompts = [...customPrompts, duplicatedPrompt];
                setCustomPrompts(updatedPrompts);
                saveToStorage(updatedPrompts);
            } catch (err) {
                console.error('Failed to duplicate prompt:', err);
                setError('Failed to duplicate prompt');
                throw err;
            }
        },
        [prompts, customPrompts, saveToStorage]
    );

    // Create custom copy of any prompt (especially useful for static prompts)
    const createCustomCopy = useCallback(
        async (id: string): Promise<string> => {
            try {
                setError(null);
                const existingPrompt = prompts.find(p => p.id === id);

                if (!existingPrompt) {
                    throw new Error('Prompt not found');
                }

                const now = new Date().toISOString();
                const newId = generateId();
                const customCopy: CustomPromptCard = {
                    ...existingPrompt,
                    id: newId,
                    title: existingPrompt.isCustom ? 
                        `${existingPrompt.title} (Copy)` : 
                        `${existingPrompt.title} (Custom)`,
                    category: 'Custom',
                    isCustom: true,
                    createdAt: now,
                    updatedAt: now,
                };

                const updatedPrompts = [...customPrompts, customCopy];
                setCustomPrompts(updatedPrompts);
                saveToStorage(updatedPrompts);

                return newId; // Return the new ID for immediate editing
            } catch (err) {
                console.error('Failed to create custom copy:', err);
                setError('Failed to create custom copy');
                throw err;
            }
        },
        [prompts, customPrompts, saveToStorage]
    );

    // Get a specific prompt by ID
    const getPromptById = useCallback(
        (id: string): CustomPromptCard | undefined => {
            return prompts.find(p => p.id === id);
        },
        [prompts]
    );

    return {
        prompts,
        loading,
        error,
        createPrompt,
        updatePrompt,
        deletePrompt,
        duplicatePrompt,
        createCustomCopy,
        getPromptById,
    };
};
