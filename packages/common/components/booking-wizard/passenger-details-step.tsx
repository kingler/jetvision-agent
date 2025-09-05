'use client';

import { useState } from 'react';
import { Button } from '@repo/ui';
import { 
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import type { BookingData } from './booking-wizard';

interface PassengerDetailsStepProps {
    data: Partial<BookingData>;
    onUpdate: (updates: Partial<BookingData>) => void;
}

export function PassengerDetailsStep({ data, onUpdate }: PassengerDetailsStepProps) {
    const [specialRequests, setSpecialRequests] = useState(data.specialRequests || '');
    const [cateringRequests, setCateringRequests] = useState(data.cateringRequests || '');
    const [groundTransport, setGroundTransport] = useState(data.groundTransportation || false);

    const handlePrimaryContactChange = (field: string, value: string) => {
        onUpdate({
            primaryContact: {
                ...data.primaryContact!,
                [field]: value
            }
        });
    };

    const handlePassengerChange = (index: number, field: string, value: string) => {
        const passengers = [...(data.passengerList || [])];
        passengers[index] = {
            ...passengers[index],
            [field]: value
        };
        onUpdate({ passengerList: passengers });
    };

    const addPassenger = () => {
        const passengers = [...(data.passengerList || [])];
        passengers.push({ name: '', email: '', phone: '' });
        onUpdate({ passengerList: passengers });
    };

    const removePassenger = (index: number) => {
        const passengers = [...(data.passengerList || [])];
        passengers.splice(index, 1);
        onUpdate({ passengerList: passengers });
    };

    const handleSpecialRequestsSubmit = () => {
        onUpdate({
            specialRequests,
            cateringRequests,
            groundTransportation: groundTransport
        });
    };

    return (
        <div className="space-y-6">
            {/* Primary Contact */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Primary Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name *
                        </label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                required
                                placeholder="John Doe"
                                value={data.primaryContact?.name || ''}
                                onChange={(e) => handlePrimaryContactChange('name', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address *
                        </label>
                        <div className="relative">
                            <EnvelopeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                required
                                placeholder="john@example.com"
                                value={data.primaryContact?.email || ''}
                                onChange={(e) => handlePrimaryContactChange('email', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number *
                        </label>
                        <div className="relative">
                            <PhoneIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                required
                                placeholder="+1 (555) 123-4567"
                                value={data.primaryContact?.phone || ''}
                                onChange={(e) => handlePrimaryContactChange('phone', e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Passengers */}
            {(data.passengers || 1) > 1 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Additional Passengers ({(data.passengers || 1) - 1} more)
                        </h3>
                        <Button
                            variant="outlined"
                            size="sm"
                            onClick={addPassenger}
                            className="flex items-center"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Passenger
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {(data.passengerList || []).map((passenger, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        Passenger {index + 2}
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePassenger(index)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Passenger name"
                                            value={passenger.name || ''}
                                            onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={passenger.email || ''}
                                            onChange={(e) => handlePassengerChange(index, 'email', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Phone (Optional)
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="Phone number"
                                            value={passenger.phone || ''}
                                            onChange={(e) => handlePassengerChange(index, 'phone', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Special Requests */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Special Requests & Preferences
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Special Requests
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Any special accommodations, accessibility requirements, or preferences..."
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            onBlur={handleSpecialRequestsSubmit}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Catering Preferences
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Dietary restrictions, meal preferences, beverage requests..."
                            value={cateringRequests}
                            onChange={(e) => setCateringRequests(e.target.value)}
                            onBlur={handleSpecialRequestsSubmit}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="ground-transport"
                            checked={groundTransport}
                            onChange={(e) => {
                                setGroundTransport(e.target.checked);
                                onUpdate({ groundTransportation: e.target.checked });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="ground-transport" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Request ground transportation arrangement
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}