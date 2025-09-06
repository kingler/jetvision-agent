'use client';

import { cn } from '@repo/ui';
import {
    ChartBarIcon,
    HomeIcon,
    UserGroupIcon,
    CogIcon,
    PaperAirplaneIcon,
    ChatBubbleLeftIcon,
    DocumentChartBarIcon,
    BellIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '../logo';
import { Button } from '@repo/ui';
import { ThemeToggle } from '../theme/theme-toggle';
import { StatusIndicator, NotificationBadge } from '../real-time/status-indicator';

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: HomeIcon },
    { name: 'Leads', href: '/dashboard/leads', icon: UserGroupIcon },
    { name: 'Fleet', href: '/dashboard/fleet', icon: PaperAirplaneIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftIcon },
];

const bottomNavigation = [
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
    { name: 'Support', href: '/dashboard/support', icon: BellIcon },
];

export function DashboardSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div
            className={cn(
                'flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800',
                isCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-4">
                {!isCollapsed && (
                    <div className="flex items-center space-x-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            JetVision
                        </span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="flex w-full justify-center">
                        <Logo className="h-8 w-8" />
                    </div>
                )}
            </div>

            {/* Connection Status */}
            <div className="px-4 py-2">
                <div className="flex items-center justify-between">
                    <StatusIndicator showLabel={!isCollapsed} size="sm" />
                    {!isCollapsed && (
                        <div className="relative">
                            <BellIcon className="h-5 w-5 text-gray-400" />
                            <NotificationBadge count={3} />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Search */}
            {!isCollapsed && (
                <div className="px-4 pb-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Quick search..."
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400"
                        />
                    </div>
                </div>
            )}

            {/* Main Navigation */}
            <nav className="flex-1 space-y-1 px-2">
                {navigation.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                            )}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <item.icon
                                className={cn(
                                    'h-5 w-5 flex-shrink-0',
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                                    !isCollapsed ? 'mr-3' : 'mx-auto'
                                )}
                            />
                            {!isCollapsed && <span className="flex-1">{item.name}</span>}
                            {!isCollapsed && isActive && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle */}
            <div className="px-4 py-2">
                <div className="flex items-center justify-center">
                    <ThemeToggle size="sm" />
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                {bottomNavigation.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                            )}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <item.icon
                                className={cn(
                                    'h-5 w-5 flex-shrink-0',
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                                    !isCollapsed ? 'mr-3' : 'mx-auto'
                                )}
                            />
                            {!isCollapsed && <span className="flex-1">{item.name}</span>}
                        </Link>
                    );
                })}
            </div>

            {/* Collapse Toggle */}
            <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full justify-center"
                >
                    <svg
                        className={cn(
                            'h-4 w-4 transition-transform',
                            isCollapsed ? 'rotate-180' : ''
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    {!isCollapsed && <span className="ml-2">Collapse</span>}
                </Button>
            </div>
        </div>
    );
}
