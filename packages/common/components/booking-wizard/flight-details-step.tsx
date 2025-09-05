'use client';

import { useState } from 'react';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui';
import { 
    MapPinIcon,
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import type { BookingData } from './booking-wizard';

interface FlightDetailsStepProps {
    data: Partial<BookingData>;
    onUpdate: (updates: Partial<BookingData>) => void;
}

const popularAirports = [
    { code: 'TEB', name: 'Teterboro Airport', city: 'New York' },
    { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles' },
    { code: 'MIA', name: 'Miami International', city: 'Miami' },
    { code: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
    { code: 'SFO', name: 'San Francisco International', city: 'San Francisco' },
    { code: 'DEN', name: 'Denver International', city: 'Denver' },
];

export function FlightDetailsStep({ data, onUpdate }: FlightDetailsStepProps) {
    const [showDepartureSearch, setShowDepartureSearch] = useState(false);
    const [showArrivalSearch, setShowArrivalSearch] = useState(false);

    const handleTripTypeChange = (type: 'one-way' | 'round-trip') => {
        onUpdate({ tripType: type });
    };

    const handleDepartureChange = (field: string, value: string) => {
        onUpdate({
            departure: {
                ...data.departure,
                [field]: value
            } as BookingData['departure']
        });
    };

    const handleArrivalChange = (field: string, value: string) => {
        onUpdate({
            arrival: {
                ...data.arrival,
                [field]: value
            } as BookingData['arrival']
        });
    };

    const swapAirports = () => {
        const tempAirport = data.departure?.airport;
        handleDepartureChange('airport', data.arrival?.airport || '');
        handleArrivalChange('airport', tempAirport || '');
    };

    return (
        <div className="space-y-6">
            {/* Trip Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Trip Type
                </label>
                <div className="flex space-x-4">
                    <Button
                        variant={data.tripType === 'one-way' ? 'default' : 'outlined'}
                        onClick={() => handleTripTypeChange('one-way')}
                        className="flex-1"
                    >
                        One Way
                    </Button>
                    <Button
                        variant={data.tripType === 'round-trip' ? 'default' : 'outlined'}
                        onClick={() => handleTripTypeChange('round-trip')}
                        className="flex-1"
                    >
                        Round Trip
                    </Button>
                </div>
            </div>

            {/* Route Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Departure */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        From
                    </label>
                    <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Departure airport"
                            value={data.departure?.airport || ''}
                            onChange={(e) => handleDepartureChange('airport', e.target.value)}
                            onFocus={() => setShowDepartureSearch(true)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {showDepartureSearch && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                                {popularAirports.map((airport) => (
                                    <button
                                        key={airport.code}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                                        onClick={() => {
                                            handleDepartureChange('airport', `${airport.code} - ${airport.name}`);
                                            setShowDepartureSearch(false);
                                        }}
                                    >
                                        <div className="font-medium">{airport.code} - {airport.city}</div>
                                        <div className="text-sm text-gray-500">{airport.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Arrival */}
                <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            To
                        </label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={swapAirports}
                            className="p-1 h-auto"
                        >
                            <ArrowsRightLeftIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Arrival airport"
                            value={data.arrival?.airport || ''}
                            onChange={(e) => handleArrivalChange('airport', e.target.value)}
                            onFocus={() => setShowArrivalSearch(true)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {showArrivalSearch && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                                {popularAirports.map((airport) => (
                                    <button
                                        key={airport.code}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                                        onClick={() => {
                                            handleArrivalChange('airport', `${airport.code} - ${airport.name}`);
                                            setShowArrivalSearch(false);
                                        }}
                                    >
                                        <div className="font-medium">{airport.code} - {airport.city}</div>
                                        <div className="text-sm text-gray-500">{airport.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Departure Date
                    </label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={data.departure?.date || ''}
                            onChange={(e) => handleDepartureChange('date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Departure Time
                    </label>
                    <div className="relative">
                        <ClockIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="time"
                            value={data.departure?.time || ''}
                            onChange={(e) => handleDepartureChange('time', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Passengers
                    </label>
                    <div className="relative">
                        <UserGroupIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <select
                            value={data.passengers || 1}
                            onChange={(e) => onUpdate({ passengers: parseInt(e.target.value) })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                                <option key={num} value={num}>
                                    {num} {num === 1 ? 'Passenger' : 'Passengers'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Return Flight (if round trip) */}
            {data.tripType === 'round-trip' && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Return Flight
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Return Date
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={data.arrival?.date || ''}
                                    onChange={(e) => handleArrivalChange('date', e.target.value)}
                                    min={data.departure?.date || new Date().toISOString().split('T')[0]}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Return Time
                            </label>
                            <div className="relative">
                                <ClockIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="time"
                                    value={data.arrival?.time || ''}
                                    onChange={(e) => handleArrivalChange('time', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}