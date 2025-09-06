import React from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function MetricCard({
    title,
    value,
    change,
    trend = 'neutral',
    className = '',
}: MetricCardProps) {
    const getTrendColor = () => {
        switch (trend) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
            <h3 className="mb-2 text-sm font-medium text-gray-600">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
                <p className={`mt-2 text-sm ${getTrendColor()}`}>
                    {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {change}
                </p>
            )}
        </div>
    );
}
