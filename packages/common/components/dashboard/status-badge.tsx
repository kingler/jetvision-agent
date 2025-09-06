import React from 'react';

interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'pending' | 'error';
    text?: string;
    className?: string;
}

export function StatusBadge({ status, text, className = '' }: StatusBadgeProps) {
    const getStatusStyles = () => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'error':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyles()} ${className}`}
        >
            <span
                className={`mr-1.5 h-2 w-2 rounded-full ${
                    status === 'active'
                        ? 'bg-green-400'
                        : status === 'pending'
                          ? 'bg-yellow-400'
                          : status === 'error'
                            ? 'bg-red-400'
                            : 'bg-gray-400'
                }`}
            ></span>
            {text || status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
