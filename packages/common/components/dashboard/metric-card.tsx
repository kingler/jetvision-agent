import React from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function MetricCard({ title, value, change, trend = 'neutral', className = '' }: MetricCardProps) {
    const getTrendColor = () => {
        switch (trend) {
            case 'up': return 'text-green-600';
            case 'down': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
                <p className={`text-sm mt-2 ${getTrendColor()}`}>
                    {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {change}
                </p>
            )}
        </div>
    );
}