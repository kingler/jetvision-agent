'use client';

import { Button } from '@repo/ui';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from './theme-provider';
import { cn } from '@repo/ui';

interface ThemeToggleProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'dropdown';
    className?: string;
}

export function ThemeToggle({ size = 'md', variant = 'icon', className }: ThemeToggleProps) {
    const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

    if (variant === 'dropdown') {
        return (
            <div className={cn('relative', className)}>
                <select
                    value={theme}
                    onChange={e => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                    className="appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                </select>
            </div>
        );
    }

    const getIcon = () => {
        if (theme === 'system') {
            return <ComputerDesktopIcon className="h-4 w-4" />;
        }
        return resolvedTheme === 'dark' ? (
            <MoonIcon className="h-4 w-4" />
        ) : (
            <SunIcon className="h-4 w-4" />
        );
    };

    const getTooltip = () => {
        if (theme === 'system') return 'System theme';
        return resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode';
    };

    return (
        <Button
            variant="ghost"
            size={size}
            onClick={toggleTheme}
            title={getTooltip()}
            className={cn(
                'transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                className
            )}
        >
            {getIcon()}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

interface ThemeStatusProps {
    className?: string;
}

export function ThemeStatus({ className }: ThemeStatusProps) {
    const { theme, resolvedTheme } = useTheme();

    return (
        <div
            className={cn(
                'flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400',
                className
            )}
        >
            <div className="flex items-center space-x-1">
                {theme === 'system' ? (
                    <ComputerDesktopIcon className="h-3 w-3" />
                ) : resolvedTheme === 'dark' ? (
                    <MoonIcon className="h-3 w-3" />
                ) : (
                    <SunIcon className="h-3 w-3" />
                )}
                <span>
                    {theme === 'system'
                        ? `System (${resolvedTheme})`
                        : theme.charAt(0).toUpperCase() + theme.slice(1)}
                </span>
            </div>
        </div>
    );
}
