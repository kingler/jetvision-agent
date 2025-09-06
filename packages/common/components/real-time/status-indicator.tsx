'use client';

import { cn } from '@repo/ui';
import { useWebSocket } from './websocket-provider';

interface StatusIndicatorProps {
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({
    className,
    showLabel = false,
    size = 'sm',
}: StatusIndicatorProps) {
    const { connectionStatus, isConnected } = useWebSocket();

    const getStatusConfig = () => {
        switch (connectionStatus) {
            case 'connected':
                return {
                    color: 'bg-green-500',
                    label: 'Connected',
                    pulse: false,
                };
            case 'connecting':
                return {
                    color: 'bg-yellow-500',
                    label: 'Connecting',
                    pulse: true,
                };
            case 'error':
                return {
                    color: 'bg-red-500',
                    label: 'Connection Error',
                    pulse: false,
                };
            default:
                return {
                    color: 'bg-gray-400',
                    label: 'Disconnected',
                    pulse: false,
                };
        }
    };

    const config = getStatusConfig();

    const sizeClasses = {
        sm: 'h-2 w-2',
        md: 'h-3 w-3',
        lg: 'h-4 w-4',
    };

    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <div className="relative">
                <div
                    className={cn(
                        'rounded-full',
                        sizeClasses[size],
                        config.color,
                        config.pulse && 'animate-pulse'
                    )}
                />
                {config.pulse && (
                    <div
                        className={cn(
                            'absolute inset-0 animate-ping rounded-full',
                            sizeClasses[size],
                            config.color,
                            'opacity-75'
                        )}
                    />
                )}
            </div>
            {showLabel && (
                <span className="text-xs text-gray-600 dark:text-gray-400">{config.label}</span>
            )}
        </div>
    );
}

interface NotificationBadgeProps {
    count: number;
    className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
    if (count === 0) return null;

    return (
        <div
            className={cn(
                'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white',
                'scale-100 transform animate-pulse',
                className
            )}
        >
            {count > 99 ? '99+' : count}
        </div>
    );
}
