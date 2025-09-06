import React from 'react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    actionButton?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    title = 'No data available',
    message = 'There is no data to display at this time.',
    actionButton,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <div className="mb-4 h-16 w-16 text-gray-400">
                <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
            <p className="mb-4 text-gray-600">{message}</p>
            {actionButton && <div className="mt-4">{actionButton}</div>}
        </div>
    );
}
