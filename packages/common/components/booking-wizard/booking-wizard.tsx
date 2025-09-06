'use client';

import { useState, useCallback } from 'react';
import { cn } from '@repo/ui';
import { Button } from '@repo/ui';
import { ChevronRightIcon, ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { FlightDetailsStep } from './flight-details-step';
import { AircraftSelectionStep } from './aircraft-selection-step';
import { PassengerDetailsStep } from './passenger-details-step';
import { ReviewBookingStep } from './review-booking-step';

export interface BookingData {
    // Flight Details
    departure: {
        airport: string;
        date: string;
        time: string;
    };
    arrival: {
        airport: string;
        date?: string;
        time?: string;
    };
    passengers: number;
    tripType: 'one-way' | 'round-trip';

    // Aircraft Selection
    selectedAircraft?: {
        id: string;
        model: string;
        tailNumber: string;
        hourlyRate: number;
    };

    // Passenger Details
    primaryContact: {
        name: string;
        email: string;
        phone: string;
    };
    passengerList: Array<{
        name: string;
        email?: string;
        phone?: string;
    }>;

    // Special Requirements
    specialRequests?: string;
    cateringRequests?: string;
    groundTransportation?: boolean;
}

interface BookingWizardProps {
    onComplete: (data: BookingData) => void;
    onCancel?: () => void;
    className?: string;
}

const steps = [
    { id: 'flight-details', name: 'Flight Details', description: 'Where and when you want to fly' },
    { id: 'aircraft-selection', name: 'Select Aircraft', description: 'Choose your preferred jet' },
    {
        id: 'passenger-details',
        name: 'Passenger Info',
        description: 'Contact and passenger details',
    },
    { id: 'review', name: 'Review & Book', description: 'Confirm your booking' },
];

export function BookingWizard({ onComplete, onCancel, className }: BookingWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [bookingData, setBookingData] = useState<Partial<BookingData>>({
        tripType: 'one-way',
        passengers: 1,
        passengerList: [],
        primaryContact: { name: '', email: '', phone: '' },
    });

    const updateBookingData = useCallback((updates: Partial<BookingData>) => {
        setBookingData(prev => ({ ...prev, ...updates }));
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const canProceed = useCallback(() => {
        switch (currentStep) {
            case 0: // Flight Details
                return !!(
                    bookingData.departure?.airport &&
                    bookingData.departure?.date &&
                    bookingData.departure?.time &&
                    bookingData.arrival?.airport
                );
            case 1: // Aircraft Selection
                return !!bookingData.selectedAircraft;
            case 2: // Passenger Details
                return !!(
                    bookingData.primaryContact?.name &&
                    bookingData.primaryContact?.email &&
                    bookingData.primaryContact?.phone
                );
            case 3: // Review
                return true;
            default:
                return false;
        }
    }, [currentStep, bookingData]);

    const handleComplete = useCallback(() => {
        if (canProceed() && (bookingData as BookingData)) {
            onComplete(bookingData as BookingData);
        }
    }, [bookingData, onComplete, canProceed]);

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <FlightDetailsStep data={bookingData} onUpdate={updateBookingData} />;
            case 1:
                return <AircraftSelectionStep data={bookingData} onUpdate={updateBookingData} />;
            case 2:
                return <PassengerDetailsStep data={bookingData} onUpdate={updateBookingData} />;
            case 3:
                return (
                    <ReviewBookingStep
                        data={bookingData as BookingData}
                        onUpdate={updateBookingData}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={cn('mx-auto max-w-4xl', className)}>
            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors',
                                        index < currentStep
                                            ? 'bg-green-500 text-white'
                                            : index === currentStep
                                              ? 'bg-blue-500 text-white'
                                              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    )}
                                >
                                    {index < currentStep ? (
                                        <CheckIcon className="h-5 w-5" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <div
                                        className={cn(
                                            'text-sm font-medium',
                                            index <= currentStep
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-500 dark:text-gray-400'
                                        )}
                                    >
                                        {step.name}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-4 h-0.5 flex-1',
                                        index < currentStep
                                            ? 'bg-green-500'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {steps[currentStep].name}
                    </h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {steps[currentStep].description}
                    </p>
                </div>

                {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <div>
                    {currentStep > 0 && (
                        <Button variant="outlined" onClick={prevStep} className="flex items-center">
                            <ChevronLeftIcon className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                    )}
                </div>

                <div className="flex space-x-3">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}

                    {currentStep < steps.length - 1 ? (
                        <Button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="flex items-center"
                        >
                            Next
                            <ChevronRightIcon className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleComplete}
                            disabled={!canProceed()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Complete Booking
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
