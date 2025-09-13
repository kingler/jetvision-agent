'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    cn,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@repo/ui';
import {
    IconChevronDown,
    IconChevronUp,
    IconEye,
    IconEyeOff,
    IconAdjustments,
    IconCheck,
} from '@tabler/icons-react';
import {
    CategoryKey,
    CategoryFilterState,
    UseCategoryFiltersReturn,
} from '../../hooks/use-category-filters';

// Category configuration matching the one in PromptCards
const categoryConfig = {
    Charter: {
        label: 'Charter Operations',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Apollo: {
        label: 'Apollo Campaigns',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Leads: {
        label: 'Lead Generation',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Analytics: {
        label: 'Analytics',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Custom: {
        label: 'Custom',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    Travel: {
        label: 'Travel Planning',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
    'People Search': {
        label: 'People Search',
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    },
};

interface CategoryControlsProps {
    categoryFilters: UseCategoryFiltersReturn;
    categoryCounts: Record<string, number>;
    className?: string;
}

export const CategoryControls: React.FC<CategoryControlsProps> = ({
    categoryFilters,
    categoryCounts,
    className,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        visibleCategories,
        toggleCategory,
        showAllCategories,
        hideAllCategories,
        isAllVisible,
        isAllHidden,
        getVisibleCategoriesCount,
    } = categoryFilters;

    const visibleCount = getVisibleCategoriesCount();
    const totalCategories = Object.keys(categoryConfig).length;

    return (
        <div className={cn('w-full', className)}>
            {/* Header with toggle button */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <IconAdjustments size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Category Filters
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                            {visibleCount} of {totalCategories} categories shown
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bulk actions dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                                Actions
                                <IconChevronDown size={12} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={showAllCategories}
                                disabled={isAllVisible}
                                className="flex items-center gap-2"
                            >
                                <IconEye size={14} />
                                Show All
                                {isAllVisible && (
                                    <IconCheck size={14} className="ml-auto text-green-500" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={hideAllCategories}
                                disabled={isAllHidden}
                                className="flex items-center gap-2"
                            >
                                <IconEyeOff size={14} />
                                Hide All
                                {isAllHidden && (
                                    <IconCheck size={14} className="ml-auto text-green-500" />
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Expand/collapse button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {isExpanded ? (
                            <>
                                Collapse <IconChevronUp size={12} />
                            </>
                        ) : (
                            <>
                                Expand <IconChevronDown size={12} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Compact view - showing only visible category chips */}
            {!isExpanded && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2"
                >
                    {Object.entries(visibleCategories)
                        .filter(([_, visible]) => visible)
                        .map(([category, _]) => {
                            const config = categoryConfig[category as CategoryKey];
                            const count = categoryCounts[category] || 0;
                            if (!config) return null;

                            return (
                                <div
                                    key={category}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                                        config.color
                                    )}
                                >
                                    <span>{config.label}</span>
                                    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/20">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}

                    {visibleCount === 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <IconEyeOff size={16} />
                            No categories selected
                        </div>
                    )}
                </motion.div>
            )}

            {/* Expanded view - showing all categories with toggle controls */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(categoryConfig).map(([category, config]) => {
                                const isVisible = visibleCategories[category];
                                const count = categoryCounts[category] || 0;

                                return (
                                    <motion.button
                                        key={category}
                                        onClick={() => toggleCategory(category as CategoryKey)}
                                        whileTap={{ scale: 0.98 }}
                                        className={cn(
                                            'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                                            'hover:shadow-sm',
                                            isVisible
                                                ? 'border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900'
                                                : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    'h-3 w-3 rounded-full transition-colors',
                                                    isVisible
                                                        ? 'bg-green-500'
                                                        : 'bg-gray-300 dark:bg-gray-600'
                                                )}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {config.label}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {count} prompts
                                                </div>
                                            </div>
                                        </div>

                                        {isVisible ? (
                                            <IconEye size={16} className="text-green-500" />
                                        ) : (
                                            <IconEyeOff size={16} className="text-gray-400" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
