'use client';

import { useState, useCallback, useEffect } from 'react';

export type CategoryKey =
    | 'Charter'
    | 'Apollo'
    | 'Leads'
    | 'Analytics'
    | 'Custom'
    | 'Travel'
    | 'People Search';

export interface CategoryFilterState {
    [key: string]: boolean;
}

export interface UseCategoryFiltersReturn {
    visibleCategories: CategoryFilterState;
    toggleCategory: (category: CategoryKey) => void;
    showAllCategories: () => void;
    hideAllCategories: () => void;
    isAllVisible: boolean;
    isAllHidden: boolean;
    getVisibleCategoriesCount: () => number;
}

const STORAGE_KEY = 'jetvision_category_filters';

// Default categories to show (all visible by default)
const DEFAULT_CATEGORIES: CategoryFilterState = {
    Charter: true,
    Apollo: true,
    Leads: true,
    Analytics: true,
    Custom: true,
    Travel: true,
    'People Search': true,
};

export const useCategoryFilters = (): UseCategoryFiltersReturn => {
    const [visibleCategories, setVisibleCategories] =
        useState<CategoryFilterState>(DEFAULT_CATEGORIES);

    // Load category filters from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new categories
                setVisibleCategories({ ...DEFAULT_CATEGORIES, ...parsed });
            }
        } catch (error) {
            console.error('Failed to load category filters:', error);
            // Fall back to defaults
            setVisibleCategories(DEFAULT_CATEGORIES);
        }
    }, []);

    // Save to localStorage whenever state changes
    const saveToStorage = useCallback((filters: CategoryFilterState) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
        } catch (error) {
            console.error('Failed to save category filters:', error);
        }
    }, []);

    // Toggle a specific category
    const toggleCategory = useCallback(
        (category: CategoryKey) => {
            setVisibleCategories(prev => {
                const updated = {
                    ...prev,
                    [category]: !prev[category],
                };
                saveToStorage(updated);
                return updated;
            });
        },
        [saveToStorage]
    );

    // Show all categories
    const showAllCategories = useCallback(() => {
        const allVisible = Object.keys(DEFAULT_CATEGORIES).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {} as CategoryFilterState);

        setVisibleCategories(allVisible);
        saveToStorage(allVisible);
    }, [saveToStorage]);

    // Hide all categories
    const hideAllCategories = useCallback(() => {
        const allHidden = Object.keys(DEFAULT_CATEGORIES).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {} as CategoryFilterState);

        setVisibleCategories(allHidden);
        saveToStorage(allHidden);
    }, [saveToStorage]);

    // Check if all categories are visible
    const isAllVisible = useCallback(() => {
        return Object.values(visibleCategories).every(visible => visible);
    }, [visibleCategories])();

    // Check if all categories are hidden
    const isAllHidden = useCallback(() => {
        return Object.values(visibleCategories).every(visible => !visible);
    }, [visibleCategories])();

    // Get count of visible categories
    const getVisibleCategoriesCount = useCallback(() => {
        return Object.values(visibleCategories).filter(visible => visible).length;
    }, [visibleCategories]);

    return {
        visibleCategories,
        toggleCategory,
        showAllCategories,
        hideAllCategories,
        isAllVisible,
        isAllHidden,
        getVisibleCategoriesCount,
    };
};
