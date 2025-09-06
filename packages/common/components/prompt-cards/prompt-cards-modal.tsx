'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui';
import { STATIC_PROMPTS_DATA, PromptCard, PromptCategory } from '../../utils/prompts-parser';
import { IconSearch, IconX, IconEdit, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { useAppStore } from '../../store/app.store';

interface PromptCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPrompt: (prompt: PromptCard) => void;
    onInsertPrompt?: (prompt: string, fullPrompt: string) => void;
}

export const PromptCardsModal: React.FC<PromptCardsModalProps> = ({
    isOpen,
    onClose,
    onSelectPrompt,
    onInsertPrompt,
}) => {
    const { isSidebarOpen } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [editingCards, setEditingCards] = useState<Set<string>>(new Set());
    const [editedContent, setEditedContent] = useState<Record<string, string>>({});

    // Flatten all prompts for grid display with filtering
    const allPrompts = STATIC_PROMPTS_DATA.flatMap(category =>
        category.prompts.map(prompt => ({
            ...prompt,
            categoryIcon: category.icon,
            categoryColor: category.color,
        }))
    );

    const filteredPrompts = allPrompts.filter(prompt => {
        if (!searchQuery) return true;
        return (
            prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleSelectPrompt = useCallback(
        (prompt: PromptCard) => {
            onSelectPrompt(prompt);
            onClose();
        },
        [onSelectPrompt, onClose]
    );

    const handleInsertPrompt = useCallback(
        (prompt: PromptCard) => {
            if (onInsertPrompt) {
                onInsertPrompt(prompt.prompt, prompt.fullPrompt);
                onClose();
            }
        },
        [onInsertPrompt, onClose]
    );

    const toggleCardExpansion = useCallback((cardId: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
                // Also remove from editing state when collapsing
                setEditingCards(prevEdit => {
                    const newEditSet = new Set(prevEdit);
                    newEditSet.delete(cardId);
                    return newEditSet;
                });
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    }, []);

    const toggleCardEditing = useCallback((cardId: string, currentPrompt: string) => {
        setEditingCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
                // Initialize edited content
                setEditedContent(prevContent => ({
                    ...prevContent,
                    [cardId]: currentPrompt,
                }));
            }
            return newSet;
        });
    }, []);

    const saveCardEdit = useCallback((cardId: string) => {
        // In a real app, this would save to backend
        setEditingCards(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
        });
    }, []);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 dark:bg-black/20"
                onClick={handleBackdropClick}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className={cn(
                        'relative overflow-hidden border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900',
                        // Mobile-first responsive sizing with safe area support
                        'h-full max-h-screen w-full rounded-none', // Mobile: full-screen
                        'sm:m-4 sm:max-h-[90vh] sm:w-[95vw] sm:max-w-2xl sm:rounded-xl', // Small screens: reduced size
                        'md:max-w-4xl', // Medium screens: larger modal
                        'lg:max-w-6xl', // Large screens: even larger
                        'xl:max-w-7xl', // Extra large: maximum size
                        // Sidebar-aware positioning (desktop only)
                        isSidebarOpen
                            ? 'md:ml-64' // Account for 240px sidebar
                            : 'md:ml-16' // Account for 50px collapsed sidebar
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="pt-mobile-safe-top flex items-center justify-between border-b border-gray-200 p-4 sm:p-6 dark:border-gray-800">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
                                Prompt Library
                            </h2>
                            <p className="text-mobile-sm text-gray-500 sm:text-sm dark:text-gray-500">
                                Choose from {allPrompts.length} professional prompts
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg transition-colors hover:bg-gray-100 sm:h-10 sm:w-10 dark:hover:bg-gray-800"
                        >
                            <IconX size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="border-b border-gray-200 p-4 sm:p-4 dark:border-gray-800">
                        <div className="relative">
                            <IconSearch
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full touch-manipulation rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-base text-gray-900 transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 sm:py-2 sm:text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Content - Grid Layout */}
                    <div className="pb-mobile-safe-bottom max-h-[calc(100vh-200px)] overflow-y-auto p-4 sm:max-h-[calc(90vh-140px)] sm:p-6">
                        {filteredPrompts.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <IconSearch
                                        size={48}
                                        className="mx-auto mb-4 text-gray-400 dark:text-gray-600"
                                    />
                                    <h3 className="text-mobile-lg mb-2 font-medium text-gray-900 sm:text-lg dark:text-gray-100">
                                        No prompts found
                                    </h3>
                                    <p className="text-mobile-sm text-gray-500 sm:text-sm dark:text-gray-400">
                                        Try adjusting your search terms
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 2xl:grid-cols-4">
                                {filteredPrompts.map(prompt => {
                                    const isExpanded = expandedCards.has(prompt.id);
                                    const isEditing = editingCards.has(prompt.id);

                                    return (
                                        <motion.div
                                            key={prompt.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                'group relative rounded-lg transition-all',
                                                'bg-white dark:bg-gray-900',
                                                'border border-gray-200 dark:border-gray-800',
                                                'shadow-md hover:shadow-lg',
                                                'hover:border-gray-300 dark:hover:border-gray-700',
                                                isExpanded &&
                                                    'sm:col-span-full lg:col-span-2 2xl:col-span-2'
                                            )}
                                        >
                                            <div className="p-4 sm:p-4">
                                                {/* Card Header */}
                                                <div className="mb-3 flex items-start justify-between">
                                                    <div className="flex flex-1 items-start gap-3">
                                                        <prompt.categoryIcon
                                                            size={20}
                                                            className="mt-0.5 text-gray-600 dark:text-gray-400"
                                                        />
                                                        <div className="flex-1">
                                                            <h4 className="text-mobile-base mb-1 line-clamp-1 font-semibold text-gray-900 sm:text-base dark:text-gray-100">
                                                                {prompt.title}
                                                            </h4>
                                                            <span className="text-mobile-xs inline-flex items-center rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 sm:text-xs dark:bg-gray-800 dark:text-gray-300">
                                                                {prompt.category}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="ml-2 flex gap-1">
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                toggleCardExpansion(prompt.id);
                                                            }}
                                                            className="touch-manipulation rounded-lg p-2 opacity-0 transition-all hover:bg-gray-100 group-hover:opacity-100 sm:p-1.5 sm:opacity-100 dark:hover:bg-gray-800"
                                                        >
                                                            <IconEdit
                                                                size={14}
                                                                className="text-gray-500 dark:text-gray-400"
                                                            />
                                                        </button>
                                                        {onInsertPrompt && (
                                                            <button
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    handleInsertPrompt(prompt);
                                                                }}
                                                                className="touch-manipulation rounded-lg p-2 opacity-0 transition-all hover:bg-gray-100 group-hover:opacity-100 sm:p-1.5 sm:opacity-100 dark:hover:bg-gray-800"
                                                                title="Insert prompt"
                                                            >
                                                                <IconArrowRight
                                                                    size={14}
                                                                    className="text-gray-500 dark:text-gray-400"
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Basic Content */}
                                                <p className="text-mobile-sm mb-3 line-clamp-2 text-gray-600 sm:text-sm dark:text-gray-400">
                                                    {prompt.description}
                                                </p>

                                                {/* Prompt Preview */}
                                                <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                                                    <p className="text-mobile-sm line-clamp-3 text-gray-700 sm:text-sm dark:text-gray-300">
                                                        "{prompt.prompt}"
                                                    </p>
                                                </div>

                                                {/* Expanded Content */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="mt-4 overflow-hidden"
                                                        >
                                                            {/* Full Prompt Section */}
                                                            <div className="mb-4">
                                                                <label className="text-mobile-sm mb-2 block font-medium text-gray-700 sm:text-sm dark:text-gray-300">
                                                                    Full Prompt:
                                                                </label>
                                                                {isEditing ? (
                                                                    <textarea
                                                                        value={
                                                                            editedContent[
                                                                                prompt.id
                                                                            ] || prompt.fullPrompt
                                                                        }
                                                                        onChange={e =>
                                                                            setEditedContent(
                                                                                prev => ({
                                                                                    ...prev,
                                                                                    [prompt.id]:
                                                                                        e.target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        className="min-h-[120px] w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                                                        placeholder="Enter full prompt..."
                                                                    />
                                                                ) : (
                                                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                                                                        <p className="text-mobile-sm whitespace-pre-wrap text-gray-700 sm:text-sm dark:text-gray-300">
                                                                            {prompt.fullPrompt}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                                                                {isEditing ? (
                                                                    <>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                saveCardEdit(
                                                                                    prompt.id
                                                                                );
                                                                            }}
                                                                            className="sm:min-h-auto inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-green-700 sm:px-3 sm:py-1.5 sm:text-sm"
                                                                        >
                                                                            <IconCheck size={14} />
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                toggleCardEditing(
                                                                                    prompt.id,
                                                                                    prompt.fullPrompt
                                                                                );
                                                                            }}
                                                                            className="sm:min-h-auto min-h-[44px] touch-manipulation rounded-lg bg-gray-100 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-3 sm:py-1.5 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                toggleCardEditing(
                                                                                    prompt.id,
                                                                                    prompt.fullPrompt
                                                                                );
                                                                            }}
                                                                            className="sm:min-h-auto inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-3 sm:py-1.5 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                                        >
                                                                            <IconEdit size={14} />
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                handleSelectPrompt(
                                                                                    prompt
                                                                                );
                                                                            }}
                                                                            className="sm:min-h-auto inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-blue-700 sm:px-3 sm:py-1.5 sm:text-sm"
                                                                        >
                                                                            <IconArrowRight
                                                                                size={14}
                                                                            />
                                                                            Use Prompt
                                                                        </button>
                                                                        {onInsertPrompt && (
                                                                            <button
                                                                                onClick={e => {
                                                                                    e.stopPropagation();
                                                                                    handleInsertPrompt(
                                                                                        prompt
                                                                                    );
                                                                                }}
                                                                                className="sm:min-h-auto inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-green-700 sm:px-3 sm:py-1.5 sm:text-sm"
                                                                            >
                                                                                <IconArrowRight
                                                                                    size={14}
                                                                                />
                                                                                Insert
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Quick Actions for non-expanded cards */}
                                                {!isExpanded && (
                                                    <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                handleSelectPrompt(prompt);
                                                            }}
                                                            className="sm:min-h-auto inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-blue-700 sm:px-3 sm:py-1.5 sm:text-sm"
                                                        >
                                                            <IconArrowRight size={14} />
                                                            Select
                                                        </button>
                                                        {onInsertPrompt && (
                                                            <button
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    handleInsertPrompt(prompt);
                                                                }}
                                                                className="sm:min-h-auto min-h-[44px] touch-manipulation rounded-lg bg-gray-100 px-4 py-2.5 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-3 sm:py-1.5 sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                                title="Insert into chat"
                                                            >
                                                                Insert
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pb-mobile-safe-bottom border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                        <p className="text-mobile-xs text-center text-gray-500 sm:text-xs dark:text-gray-400">
                            {allPrompts.length} professional prompts • Optimized for JetVision
                            operations
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
