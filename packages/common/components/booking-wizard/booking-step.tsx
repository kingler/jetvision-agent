'use client';

import { cn } from '@repo/ui';
import { CheckIcon } from '@heroicons/react/24/outline';

interface BookingStepProps {
    step: number;
    currentStep: number;
    title: string;
    description?: string;
    isCompleted: boolean;
    onClick?: () => void;
}

export function BookingStep({
    step,
    currentStep,
    title,
    description,
    isCompleted,
    onClick,
}: BookingStepProps) {
    const isActive = step === currentStep;
    const isPast = step < currentStep;

    return (
        <div
            className={cn(
                'flex cursor-pointer items-center transition-opacity',
                onClick ? 'hover:opacity-80' : '',
                !isActive && !isPast ? 'opacity-60' : ''
            )}
            onClick={onClick}
        >
            <div
                className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isActive && 'bg-blue-500 text-white',
                    isPast && 'bg-green-500 text-white',
                    !isActive &&
                        !isPast &&
                        'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}
            >
                {isPast || isCompleted ? <CheckIcon className="h-4 w-4" /> : step}
            </div>

            <div className="ml-3">
                <div
                    className={cn(
                        'text-sm font-medium',
                        isActive && 'text-gray-900 dark:text-white',
                        isPast && 'text-green-600 dark:text-green-400',
                        !isActive && !isPast && 'text-gray-500 dark:text-gray-400'
                    )}
                >
                    {title}
                </div>
                {description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                )}
            </div>
        </div>
    );
}
