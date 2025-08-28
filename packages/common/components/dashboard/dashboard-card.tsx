import React from 'react';

interface DashboardCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}