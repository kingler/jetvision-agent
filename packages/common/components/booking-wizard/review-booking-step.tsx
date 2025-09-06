'use client';

import {
    MapPinIcon,
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    PaperAirplaneIcon,
    CurrencyDollarIcon,
    EnvelopeIcon,
    PhoneIcon,
} from '@heroicons/react/24/outline';
import type { BookingData } from './booking-wizard';

interface ReviewBookingStepProps {
    data: BookingData;
    onUpdate: (updates: Partial<BookingData>) => void;
}

export function ReviewBookingStep({ data }: ReviewBookingStepProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Estimate flight duration and total cost
    const estimatedHours = 2.5; // Would be calculated based on actual route
    const hourlyRate = data.selectedAircraft?.hourlyRate || 0;
    const flightCost = hourlyRate * estimatedHours;
    const taxes = flightCost * 0.075; // 7.5% tax estimate
    const fees = 500; // Landing fees, handling, etc.
    const totalCost = flightCost + taxes + fees;

    return (
        <div className="space-y-6">
            {/* Flight Summary */}
            <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
                <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <PaperAirplaneIcon className="mr-2 h-5 w-5" />
                    Flight Details
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Departure */}
                    <div className="space-y-2">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <MapPinIcon className="mr-2 h-4 w-4" />
                            <span className="text-sm font-medium">Departure</span>
                        </div>
                        <div className="pl-6">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {data.departure.airport}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(data.departure.date)} at{' '}
                                {formatTime(data.departure.time)}
                            </div>
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="space-y-2">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <MapPinIcon className="mr-2 h-4 w-4" />
                            <span className="text-sm font-medium">Arrival</span>
                        </div>
                        <div className="pl-6">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {data.arrival.airport}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Estimated arrival
                            </div>
                        </div>
                    </div>
                </div>

                {/* Return Flight (if applicable) */}
                {data.tripType === 'round-trip' && data.arrival.date && (
                    <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-600">
                        <div className="mb-3 flex items-center text-gray-600 dark:text-gray-400">
                            <span className="text-sm font-medium">Return Flight</span>
                        </div>
                        <div className="pl-6">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {data.arrival.airport} → {data.departure.airport}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(data.arrival.date)} at{' '}
                                {formatTime(data.arrival.time || '09:00')}
                            </div>
                        </div>
                    </div>
                )}

                {/* Trip Info */}
                <div className="mt-6 flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                        <UserGroupIcon className="mr-1 h-4 w-4" />
                        {data.passengers} passenger{data.passengers > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center">
                        <ClockIcon className="mr-1 h-4 w-4" />~{estimatedHours}h flight
                    </div>
                    <div className="capitalize">{data.tripType.replace('-', ' ')}</div>
                </div>
            </div>

            {/* Aircraft Details */}
            <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Selected Aircraft
                </h3>
                {data.selectedAircraft && (
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {data.selectedAircraft.model}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {data.selectedAircraft.tailNumber}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(data.selectedAircraft.hourlyRate)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">per hour</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Passenger Information */}
            <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Contact Information
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center">
                        <span className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Name:
                        </span>
                        <span className="text-gray-900 dark:text-white">
                            {data.primaryContact.name}
                        </span>
                    </div>

                    <div className="flex items-center">
                        <EnvelopeIcon className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Email:
                        </span>
                        <span className="text-gray-900 dark:text-white">
                            {data.primaryContact.email}
                        </span>
                    </div>

                    <div className="flex items-center">
                        <PhoneIcon className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Phone:
                        </span>
                        <span className="text-gray-900 dark:text-white">
                            {data.primaryContact.phone}
                        </span>
                    </div>
                </div>

                {data.passengerList && data.passengerList.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
                        <div className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                            Additional Passengers:
                        </div>
                        <div className="space-y-1">
                            {data.passengerList.map((passenger, index) => (
                                <div key={index} className="text-sm text-gray-900 dark:text-white">
                                    {passenger.name || `Passenger ${index + 2}`}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Special Requests */}
            {(data.specialRequests || data.cateringRequests || data.groundTransportation) && (
                <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                        Special Requests
                    </h3>

                    <div className="space-y-3">
                        {data.specialRequests && (
                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Special Accommodations:
                                </div>
                                <div className="text-sm text-gray-900 dark:text-white">
                                    {data.specialRequests}
                                </div>
                            </div>
                        )}

                        {data.cateringRequests && (
                            <div>
                                <div className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Catering Preferences:
                                </div>
                                <div className="text-sm text-gray-900 dark:text-white">
                                    {data.cateringRequests}
                                </div>
                            </div>
                        )}

                        {data.groundTransportation && (
                            <div className="text-sm text-gray-900 dark:text-white">
                                ✓ Ground transportation requested
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cost Breakdown */}
            <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
                <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <CurrencyDollarIcon className="mr-2 h-5 w-5" />
                    Cost Estimate
                </h3>

                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            Flight time ({estimatedHours}h × {formatCurrency(hourlyRate)}/h)
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(flightCost)}
                        </span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Taxes & fees</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(taxes + fees)}
                        </span>
                    </div>

                    <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
                        <div className="flex justify-between">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                Total Estimate
                            </span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(totalCost)}
                            </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            *Final cost may vary based on actual flight time and additional services
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms Notice */}
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> By completing this booking, you agree to our terms
                    and conditions. A deposit may be required to confirm your reservation. Our team
                    will contact you within 24 hours to finalize the details and arrange payment.
                </div>
            </div>
        </div>
    );
}
