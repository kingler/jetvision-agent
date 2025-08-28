'use client';

import { useState } from 'react';
import { cn } from '@repo/ui';
import { Button } from '@repo/ui';
import { 
    PaperAirplaneIcon,
    UserGroupIcon,
    ClockIcon,
    CurrencyDollarIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import type { BookingData } from './booking-wizard';

interface Aircraft {
    id: string;
    model: string;
    tailNumber: string;
    type: string;
    capacity: number;
    range: number;
    speed: number;
    hourlyRate: number;
    available: boolean;
    features: string[];
    image?: string;
}

const availableAircraft: Aircraft[] = [
    {
        id: '1',
        model: 'Citation X+',
        tailNumber: 'N123JV',
        type: 'Super-Midsize',
        capacity: 10,
        range: 3408,
        speed: 527,
        hourlyRate: 4500,
        available: true,
        features: ['Wi-Fi', 'Refreshment Center', 'Executive Seating', 'Entertainment System']
    },
    {
        id: '2',
        model: 'Falcon 900EX',
        tailNumber: 'N456JV',
        type: 'Heavy Jet',
        capacity: 14,
        range: 4500,
        speed: 482,
        hourlyRate: 6200,
        available: false,
        features: ['Full Galley', 'Private Lavatory', 'Conference Setup', 'Satellite Phone']
    },
    {
        id: '3',
        model: 'Gulfstream G550',
        tailNumber: 'N789JV',
        type: 'Ultra Long Range',
        capacity: 16,
        range: 6750,
        speed: 488,
        hourlyRate: 7800,
        available: true,
        features: ['Bedroom Suite', 'Full Kitchen', 'Entertainment Center', 'High-Speed Internet']
    },
    {
        id: '4',
        model: 'Bombardier Global 6000',
        tailNumber: 'N321JV',
        type: 'Ultra Long Range',
        capacity: 13,
        range: 6000,
        speed: 513,
        hourlyRate: 8500,
        available: true,
        features: ['Master Suite', 'Conference Area', 'Premium Catering', 'Satellite Communications']
    }
];

interface AircraftSelectionStepProps {
    data: Partial<BookingData>;
    onUpdate: (updates: Partial<BookingData>) => void;
}

export function AircraftSelectionStep({ data, onUpdate }: AircraftSelectionStepProps) {
    const [filter, setFilter] = useState<'all' | 'available' | 'suitable'>('suitable');

    const filteredAircraft = availableAircraft.filter(aircraft => {
        switch (filter) {
            case 'available':
                return aircraft.available;
            case 'suitable':
                return aircraft.available && aircraft.capacity >= (data.passengers || 1);
            default:
                return true;
        }
    });

    const handleSelectAircraft = (aircraft: Aircraft) => {
        if (!aircraft.available) return;
        
        onUpdate({
            selectedAircraft: {
                id: aircraft.id,
                model: aircraft.model,
                tailNumber: aircraft.tailNumber,
                hourlyRate: aircraft.hourlyRate
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const estimateFlightTime = (distance: number = 1500) => {
        // Simplified estimate - would normally calculate based on route
        return Math.round(distance / 450); // Average speed
    };

    return (
        <div className="space-y-6">
            {/* Filter Options */}
            <div className="flex space-x-4">
                <Button
                    variant={filter === 'suitable' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('suitable')}
                >
                    Suitable for {data.passengers || 1} passenger{(data.passengers || 1) > 1 ? 's' : ''}
                </Button>
                <Button
                    variant={filter === 'available' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('available')}
                >
                    Available Now
                </Button>
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All Aircraft
                </Button>
            </div>

            {/* Aircraft Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAircraft.map((aircraft) => {
                    const isSelected = data.selectedAircraft?.id === aircraft.id;
                    const canSelect = aircraft.available && aircraft.capacity >= (data.passengers || 1);
                    
                    return (
                        <div
                            key={aircraft.id}
                            className={cn(
                                'relative border-2 rounded-lg p-6 transition-all cursor-pointer',
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : canSelect
                                    ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    : 'border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed',
                                !aircraft.available && 'bg-gray-50 dark:bg-gray-900/50'
                            )}
                            onClick={() => canSelect && handleSelectAircraft(aircraft)}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <CheckIcon className="h-4 w-4 text-white" />
                                </div>
                            )}

                            {/* Aircraft Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <PaperAirplaneIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {aircraft.model}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {aircraft.tailNumber} • {aircraft.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(aircraft.hourlyRate)}
                                    </div>
                                    <div className="text-sm text-gray-500">per hour</div>
                                </div>
                            </div>

                            {/* Aircraft Specs */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                    <UserGroupIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                    <div className="text-sm font-medium">{aircraft.capacity}</div>
                                    <div className="text-xs text-gray-500">Passengers</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-medium">{aircraft.range.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Range (nm)</div>
                                </div>
                                <div className="text-center">
                                    <ClockIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                    <div className="text-sm font-medium">{aircraft.speed}</div>
                                    <div className="text-xs text-gray-500">Speed (kts)</div>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                    {aircraft.features.slice(0, 3).map((feature) => (
                                        <span
                                            key={feature}
                                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                    {aircraft.features.length > 3 && (
                                        <span className="px-2 py-1 text-xs text-gray-500">
                                            +{aircraft.features.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Availability Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className={cn(
                                        'w-2 h-2 rounded-full',
                                        aircraft.available ? 'bg-green-500' : 'bg-red-500'
                                    )} />
                                    <span className={cn(
                                        'text-sm font-medium',
                                        aircraft.available 
                                            ? 'text-green-600 dark:text-green-400' 
                                            : 'text-red-600 dark:text-red-400'
                                    )}>
                                        {aircraft.available ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                
                                {aircraft.capacity < (data.passengers || 1) && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400">
                                        Too small for {data.passengers} passengers
                                    </span>
                                )}
                            </div>

                            {/* Estimated Cost */}
                            {canSelect && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            Est. cost ({estimateFlightTime()}h flight):
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(aircraft.hourlyRate * estimateFlightTime())}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredAircraft.length === 0 && (
                <div className="text-center py-12">
                    <PaperAirplaneIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No aircraft available
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        No aircraft match your current criteria. Try adjusting the filter or contact us for alternatives.
                    </p>
                </div>
            )}
        </div>
    );
}