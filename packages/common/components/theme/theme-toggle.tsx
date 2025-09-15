'use client';

import { Button } from '@repo/ui';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
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
                    className="appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            return <IconDeviceDesktop size={16} strokeWidth={2} />;
        }
        return resolvedTheme === 'dark' ? (
            <IconSun size={16} strokeWidth={2} />
        ) : (
            <IconMoon size={16} strokeWidth={2} />
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
                'transition-all duration-200 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
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
                'flex items-center space-x-2 text-xs text-muted-foreground',
                className
            )}
        >
            <div className="flex items-center space-x-1">
                {theme === 'system' ? (
                    <IconDeviceDesktop size={12} strokeWidth={2} />
                ) : resolvedTheme === 'dark' ? (
                    <IconMoon size={12} strokeWidth={2} />
                ) : (
                    <IconSun size={12} strokeWidth={2} />
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
