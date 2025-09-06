import React from 'react';

interface DashboardCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function DashboardCard({ title, children, className = '' }: DashboardCardProps) {
    return (
        <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
            <h3 className="mb-4 text-lg font-semibold">{title}</h3>
            {children}
        </div>
    );
}
