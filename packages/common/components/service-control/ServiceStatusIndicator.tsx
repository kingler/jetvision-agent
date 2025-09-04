'use client';
import { motion } from 'framer-motion';
import { ServiceStatus } from '../../store/service-control.store';

interface ServiceStatusIndicatorProps {
    status: ServiceStatus;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const statusConfig = {
    enabled: {
        icon: '🟢',
        label: 'Online',
        color: 'text-green-500',
        bgColor: 'bg-green-100',
    },
    disabled: {
        icon: '⚫',
        label: 'Offline',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
    },
    error: {
        icon: '🔴',
        label: 'Error',
        color: 'text-red-500',
        bgColor: 'bg-red-100',
    },
    loading: {
        icon: '🔄',
        label: 'Loading',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
    },
    maintenance: {
        icon: '🔧',
        label: 'Maintenance',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
    },
};

const sizeConfig = {
    sm: {
        iconSize: 'text-xs',
        textSize: 'text-xs',
        padding: 'px-1.5 py-0.5',
    },
    md: {
        iconSize: 'text-sm',
        textSize: 'text-sm',
        padding: 'px-2 py-1',
    },
    lg: {
        iconSize: 'text-base',
        textSize: 'text-base',
        padding: 'px-3 py-1.5',
    },
};

export const ServiceStatusIndicator = ({
    status,
    size = 'md',
    showLabel = false,
    className = '',
}: ServiceStatusIndicatorProps) => {
    const config = statusConfig[status];
    const sizing = sizeConfig[size];

    return (
        <motion.div
            className={`inline-flex items-center gap-1.5 rounded-full ${config.bgColor} ${sizing.padding} ${className}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            <motion.span
                className={`${sizing.iconSize}`}
                animate={
                    status === 'loading'
                        ? {
                              rotate: 360,
                          }
                        : {}
                }
                transition={
                    status === 'loading'
                        ? {
                              duration: 2,
                              repeat: Infinity,
                              ease: 'linear',
                          }
                        : {}
                }
            >
                {config.icon}
            </motion.span>
            {showLabel && (
                <span className={`font-medium ${config.color} ${sizing.textSize}`}>
                    {config.label}
                </span>
            )}
        </motion.div>
    );
};