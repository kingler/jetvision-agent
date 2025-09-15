'use client';

import { Button } from '@repo/ui';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from './theme-provider';
import { cn } from '@repo/ui';

interface SimpleThemeToggleProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Simple theme toggle that only switches between light and dark modes
 * Shows sun icon when in dark mode (clicking switches to light)
 * Shows moon icon when in light mode (clicking switches to dark)
 */
export function SimpleThemeToggle({ size = 'sm', className }: SimpleThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    const getIcon = () => {
        // Show sun when in dark mode (clicking will go to light)
        // Show moon when in light mode (clicking will go to dark)
        return resolvedTheme === 'dark' ? (
            <IconSun size={16} strokeWidth={2} />
        ) : (
            <IconMoon size={16} strokeWidth={2} />
        );
    };

    const getTooltip = () => {
        return resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    };

    return (
        <Button
            variant="ghost"
            size={size}
            onClick={toggleTheme}
            title={getTooltip()}
            className={cn(
                'transition-all duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
                className
            )}
        >
            {getIcon()}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
