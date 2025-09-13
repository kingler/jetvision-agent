'use client';
import React, { useState, useCallback } from 'react';
import {
    cn,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@repo/ui';
import { scrollToChatInputWithFocus } from '@repo/common/utils';
import { formatPromptForDisplay } from '@repo/shared/utils';
import {
    IconRocket,
    IconUsers,
    IconChartBar,
    IconPlane,
    IconCalendar,
    IconSearch,
    IconUserSearch,
    IconDotsVertical,
    IconEdit,
    IconCopy,
    IconTrash,
    IconPlus,
    IconStar,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { usePromptManager } from '../../hooks/use-prompt-manager';
import { useCategoryFilters } from '../../hooks/use-category-filters';
import { PromptEditor } from '../prompt-cards/prompt-editor';
import { ConfirmationDialog } from '../prompt-cards/confirmation-dialog';
import { CategoryControls } from '../prompt-cards/category-controls';

// Add New Prompt Card Component
interface AddNewPromptCardProps {
    onClick: () => void;
}

const AddNewPromptCard: React.FC<AddNewPromptCardProps> = ({ onClick }) => {
    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="group">
            <button
                onClick={onClick}
                className={cn(
                    'h-full min-h-[140px] w-full rounded-lg p-6 text-left transition-all',
                    'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
                    'border-2 border-dashed border-gray-300 dark:border-gray-600',
                    'hover:border-gray-400 dark:hover:border-gray-500',
                    'hover:from-gray-50 hover:to-gray-200 hover:shadow-lg dark:hover:from-gray-800 dark:hover:to-gray-700',
                    'focus:ring-brand focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'flex flex-col items-center justify-center gap-3'
                )}
            >
                <div className="text-brand dark:text-brand-foreground rounded-full bg-gray-100 p-3 transition-colors group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700">
                    <IconPlus size={24} />
                </div>
                <div className="text-center">
                    <h4 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                        Add New Prompt
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create a custom prompt
                    </p>
                </div>
            </button>
        </motion.div>
    );
};

// Enhanced category configurations with more types
const enhancedCategoryConfig = {
    Charter: {
        label: 'Jet Charter Operations',
        icon: IconPlane,
        description: 'Fleet management and aircraft availability',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Apollo: {
        label: 'Apollo Campaign Management',
        icon: IconRocket,
        description: 'Sales intelligence and email campaigns',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Leads: {
        label: 'Lead Generation & Targeting',
        icon: IconUsers,
        description: 'Prospect identification and scoring',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Analytics: {
        label: 'Analytics & Insights',
        icon: IconChartBar,
        description: 'Performance metrics and reporting',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Custom: {
        label: 'Custom Prompts',
        icon: IconStar,
        description: 'Your personalized prompt library',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Travel: {
        label: 'Travel Planning & Coordination',
        icon: IconCalendar,
        description: 'Multi-city itineraries and logistics',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    'People Search': {
        label: 'People Search & Intelligence',
        icon: IconUserSearch,
        description: 'Apollo.io people search and prospect targeting',
        color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
};

interface PromptCardsProps {
    onSelectPrompt: (prompt: string, fullPrompt: string, parameters?: Record<string, any>) => void;
    className?: string;
}

export const PromptCards: React.FC<PromptCardsProps> = ({ onSelectPrompt, className }) => {
    const {
        prompts,
        loading,
        error,
        createPrompt,
        updatePrompt,
        deletePrompt,
        duplicatePrompt,
        createCustomCopy,
        getPromptById,
    } = usePromptManager();

    // Category filtering hook
    const categoryFilters = useCategoryFilters();

    // Modal states
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [confirmationConfig, setConfirmationConfig] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        promptTitle?: string;
        variant?: 'danger' | 'warning' | 'info';
    } | null>(null);

    // Handle prompt actions
    const handleCreateNew = useCallback(() => {
        setEditorMode('create');
        setSelectedPromptId(null);
        setIsEditorOpen(true);
    }, []);

    const handleEdit = useCallback(
        async (promptId: string) => {
            const prompt = getPromptById(promptId);
            if (!prompt) return;

            if (prompt.isCustom) {
                // Edit existing custom prompt
                setEditorMode('edit');
                setSelectedPromptId(promptId);
                setIsEditorOpen(true);
            } else {
                // Create custom copy of static prompt for editing
                try {
                    const newId = await createCustomCopy(promptId);
                    setEditorMode('edit');
                    setSelectedPromptId(newId);
                    setIsEditorOpen(true);
                } catch (error) {
                    console.error('Failed to create custom copy:', error);
                }
            }
        },
        [getPromptById, createCustomCopy]
    );

    const handleDuplicate = useCallback(
        async (promptId: string) => {
            try {
                await duplicatePrompt(promptId);
            } catch (error) {
                console.error('Failed to duplicate prompt:', error);
            }
        },
        [duplicatePrompt]
    );

    const handleDelete = useCallback(
        (promptId: string) => {
            const prompt = getPromptById(promptId);
            if (prompt?.isCustom) {
                setConfirmationConfig({
                    title: 'Delete Prompt',
                    message:
                        'Are you sure you want to delete this prompt? This action cannot be undone.',
                    promptTitle: prompt.title,
                    variant: 'danger',
                    onConfirm: async () => {
                        try {
                            await deletePrompt(promptId);
                        } catch (error) {
                            console.error('Failed to delete prompt:', error);
                        }
                    },
                });
                setIsConfirmationOpen(true);
            }
        },
        [getPromptById, deletePrompt]
    );

    const handleSavePrompt = useCallback(
        async (title: string, prompt: string, fullPrompt: string, description: string) => {
            try {
                if (editorMode === 'create') {
                    await createPrompt(title, prompt, fullPrompt, description);
                } else if (selectedPromptId) {
                    await updatePrompt(selectedPromptId, title, prompt, fullPrompt, description);
                }
                setIsEditorOpen(false);
                setSelectedPromptId(null);
            } catch (error) {
                console.error('Failed to save prompt:', error);
            }
        },
        [editorMode, selectedPromptId, createPrompt, updatePrompt]
    );

    const selectedPromptData = selectedPromptId ? getPromptById(selectedPromptId) : undefined;

    // Show loading state
    if (loading) {
        return (
            <div className={cn('flex w-full items-center justify-center py-12', className)}>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span>Loading prompts...</span>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className={cn('flex w-full items-center justify-center py-12', className)}>
                <div className="text-center">
                    <div className="mb-2 text-red-500 dark:text-red-400">
                        <IconSearch size={48} className="mx-auto opacity-50" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                        Error Loading Prompts
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
    };

    // Group prompts by category
    const groupedPrompts = prompts.reduce(
        (acc, prompt) => {
            if (!acc[prompt.category]) {
                acc[prompt.category] = [];
            }
            acc[prompt.category].push(prompt);
            return acc;
        },
        {} as Record<string, typeof prompts>
    );

    // Ensure Custom category always exists even if empty
    if (!groupedPrompts['Custom']) {
        groupedPrompts['Custom'] = [];
    }

    // Filter grouped prompts based on category visibility
    const filteredGroupedPrompts = Object.entries(groupedPrompts).reduce(
        (acc, [category, categoryPrompts]) => {
            if (categoryFilters.visibleCategories[category]) {
                acc[category] = categoryPrompts;
            }
            return acc;
        },
        {} as Record<string, typeof prompts>
    );

    // Calculate category counts for the controls
    const categoryCounts = Object.entries(groupedPrompts).reduce(
        (acc, [category, categoryPrompts]) => {
            acc[category] = categoryPrompts.length;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <>
            <motion.div
                className={cn('w-full', className)}
                variants={container}
                initial="hidden"
                animate="show"
            >
                {/* Category Controls */}
                <div className="mb-6">
                    <CategoryControls
                        categoryFilters={categoryFilters}
                        categoryCounts={categoryCounts}
                    />
                </div>

                {/* Category Sections */}
                <div className="space-y-8">
                    {Object.entries(filteredGroupedPrompts).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconSearch size={48} className="mb-4 text-gray-400 opacity-50" />
                            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                                No categories selected
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enable category filters above to show prompt cards
                            </p>
                        </div>
                    ) : (
                        Object.entries(filteredGroupedPrompts).map(
                            ([category, categoryPrompts]) => {
                                const config =
                                    enhancedCategoryConfig[
                                        category as keyof typeof enhancedCategoryConfig
                                    ];
                                if (!config) return null;

                                return (
                                    <div key={category} className="space-y-4">
                                        {/* Category Header */}
                                        <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
                                            <div className="flex items-center gap-3">
                                                <config.icon
                                                    size={20}
                                                    className="text-gray-600 dark:text-gray-400"
                                                />
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                        {config.label}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                                        {config.description}
                                                    </p>
                                                </div>
                                                {category === 'Custom' && (
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                            config.color
                                                        )}
                                                    >
                                                        {categoryPrompts.length} custom
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cards Grid */}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {/* Add New Prompt Card for Custom Category */}
                                            {category === 'Custom' && (
                                                <AddNewPromptCard onClick={handleCreateNew} />
                                            )}

                                            {/* Prompt Cards */}
                                            {categoryPrompts.map(prompt => {
                                                const Icon = config.icon;
                                                return (
                                                    <motion.div
                                                        key={prompt.id}
                                                        variants={item}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <div className="group relative">
                                                            {/* Main Card Button */}
                                                            <button
                                                                onClick={() => {
                                                                    const displayPrompt =
                                                                        formatPromptForDisplay(
                                                                            prompt.prompt
                                                                        );
                                                                    onSelectPrompt(
                                                                        displayPrompt,
                                                                        prompt.fullPrompt,
                                                                        prompt.parameters
                                                                    );
                                                                    scrollToChatInputWithFocus(100);
                                                                }}
                                                                className={cn(
                                                                    'w-full rounded-lg p-4 text-left transition-all',
                                                                    'bg-white dark:bg-gray-900',
                                                                    'border border-gray-200 dark:border-gray-800',
                                                                    'shadow-md hover:shadow-lg',
                                                                    'hover:border-gray-300 dark:hover:border-gray-700',
                                                                    'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
                                                                )}
                                                            >
                                                                <div className="flex h-full flex-col gap-2">
                                                                    {/* Header with Icon */}
                                                                    <div className="mb-1 flex items-start justify-between">
                                                                        <Icon
                                                                            size={20}
                                                                            className="text-gray-600 dark:text-gray-400"
                                                                        />
                                                                        {/* Placeholder to maintain layout */}
                                                                        <div className="h-6 w-6" />
                                                                    </div>

                                                                    {/* Title */}
                                                                    <h4 className="line-clamp-1 font-semibold text-gray-900 dark:text-gray-100">
                                                                        {prompt.title}
                                                                    </h4>

                                                                    {/* Prompt preview */}
                                                                    <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                                                                        {prompt.prompt}
                                                                    </p>

                                                                    {/* Custom prompt indicator */}
                                                                    {prompt.isCustom && (
                                                                        <div className="mt-2 flex items-center gap-1">
                                                                            <IconStar
                                                                                size={12}
                                                                                className="text-green-500"
                                                                            />
                                                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                                                Custom
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>

                                                            {/* Dropdown Menu - Outside the button */}
                                                            <div
                                                                className={cn(
                                                                    'absolute right-4 top-4',
                                                                    'opacity-0 transition-opacity group-hover:opacity-100',
                                                                    'sm:opacity-100' // Always visible on mobile
                                                                )}
                                                            >
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button
                                                                            onClick={e =>
                                                                                e.stopPropagation()
                                                                            }
                                                                            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                        >
                                                                            <IconDotsVertical
                                                                                size={16}
                                                                                className="text-gray-500 dark:text-gray-400"
                                                                            />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                const displayPrompt =
                                                                                    formatPromptForDisplay(
                                                                                        prompt.prompt
                                                                                    );
                                                                                onSelectPrompt(
                                                                                    displayPrompt,
                                                                                    prompt.fullPrompt,
                                                                                    prompt.parameters
                                                                                );
                                                                                scrollToChatInputWithFocus(
                                                                                    100
                                                                                );
                                                                            }}
                                                                        >
                                                                            <IconCopy size={14} />
                                                                            Insert
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                handleEdit(
                                                                                    prompt.id
                                                                                );
                                                                            }}
                                                                        >
                                                                            <IconEdit size={14} />
                                                                            Edit
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                handleDelete(
                                                                                    prompt.id
                                                                                );
                                                                            }}
                                                                            disabled={
                                                                                !prompt.isCustom
                                                                            }
                                                                            className="text-red-600 focus:bg-red-50 disabled:text-gray-400 dark:text-red-400 dark:focus:bg-red-900/20 disabled:dark:text-gray-600"
                                                                        >
                                                                            <IconTrash size={14} />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }
                        )
                    )}
                </div>
            </motion.div>

            {/* Modals */}
            <PromptEditor
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false);
                    setSelectedPromptId(null);
                }}
                onSave={handleSavePrompt}
                initialData={
                    selectedPromptData
                        ? {
                              title: selectedPromptData.title,
                              prompt: selectedPromptData.prompt,
                              fullPrompt: selectedPromptData.fullPrompt,
                              description: selectedPromptData.description,
                          }
                        : undefined
                }
                mode={editorMode}
            />

            <ConfirmationDialog
                isOpen={isConfirmationOpen}
                onClose={() => {
                    setIsConfirmationOpen(false);
                    setConfirmationConfig(null);
                }}
                onConfirm={confirmationConfig?.onConfirm || (() => {})}
                title={confirmationConfig?.title || ''}
                message={confirmationConfig?.message || ''}
                promptTitle={confirmationConfig?.promptTitle}
                variant={confirmationConfig?.variant}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
};
