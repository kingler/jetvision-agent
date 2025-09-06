/**
 * Booking Wizard Functionality Tests
 * Tests the booking flow, form validation, and integration logic
 */

import { describe, it, expect } from '@jest/globals';

// Define BookingData interface at the top level
interface BookingData {
    departure: string;
    arrival: string;
    date: string;
    passengers: number;
    aircraft?: string;
    specialRequests?: string;
}

describe('Booking Wizard Logic', () => {
    it('should validate booking form data', () => {
        const validateBooking = (data: Partial<BookingData>): string[] => {
            const errors: string[] = [];

            if (!data.departure) errors.push('Departure location is required');
            if (!data.arrival) errors.push('Arrival location is required');
            if (!data.date) errors.push('Date is required');
            if (!data.passengers || data.passengers < 1)
                errors.push('At least 1 passenger required');
            if (data.passengers && data.passengers > 50)
                errors.push('Maximum 50 passengers allowed');

            return errors;
        };

        // Valid booking
        const validBooking = {
            departure: 'KJFK',
            arrival: 'KLAX',
            date: '2025-12-01',
            passengers: 4,
        };
        expect(validateBooking(validBooking)).toHaveLength(0);

        // Invalid booking - missing fields
        const invalidBooking = {
            passengers: 0,
        };
        const errors = validateBooking(invalidBooking);
        expect(errors).toContain('Departure location is required');
        expect(errors).toContain('Arrival location is required');
        expect(errors).toContain('Date is required');
        expect(errors).toContain('At least 1 passenger required');

        // Invalid booking - too many passengers
        const tooManyPassengers = {
            departure: 'KJFK',
            arrival: 'KLAX',
            date: '2025-12-01',
            passengers: 100,
        };
        expect(validateBooking(tooManyPassengers)).toContain('Maximum 50 passengers allowed');
    });

    it('should format booking data for N8N workflow', () => {
        const formatForN8n = (booking: BookingData): any => {
            return {
                type: 'booking_request',
                data: {
                    route: {
                        from: booking.departure,
                        to: booking.arrival,
                        date: booking.date,
                    },
                    passengers: booking.passengers,
                    preferences: {
                        aircraft: booking.aircraft || 'any',
                        specialRequests: booking.specialRequests || '',
                    },
                    timestamp: new Date().toISOString(),
                },
            };
        };

        const booking: BookingData = {
            departure: 'KJFK',
            arrival: 'KLAX',
            date: '2025-12-01',
            passengers: 4,
            aircraft: 'Gulfstream G650',
            specialRequests: 'Vegetarian catering',
        };

        const formatted = formatForN8n(booking);

        expect(formatted.type).toBe('booking_request');
        expect(formatted.data.route.from).toBe('KJFK');
        expect(formatted.data.route.to).toBe('KLAX');
        expect(formatted.data.passengers).toBe(4);
        expect(formatted.data.preferences.aircraft).toBe('Gulfstream G650');
        expect(formatted.data.preferences.specialRequests).toBe('Vegetarian catering');
        expect(formatted.data.timestamp).toBeDefined();
    });

    it('should calculate estimated flight duration', () => {
        const estimateFlightTime = (departure: string, arrival: string): number => {
            // Simplified distance calculation for common US routes
            const routes: Record<string, Record<string, number>> = {
                KJFK: { KLAX: 350, KORD: 120, KMIA: 180 },
                KLAX: { KJFK: 350, KLAS: 45, KSFO: 60 },
                KORD: { KJFK: 120, KLAX: 300, KDEN: 120 },
            };

            return routes[departure]?.[arrival] || 240; // Default 4 hours
        };

        expect(estimateFlightTime('KJFK', 'KLAX')).toBe(350); // 5h 50m
        expect(estimateFlightTime('KLAX', 'KSFO')).toBe(60); // 1h
        expect(estimateFlightTime('UNKNOWN', 'UNKNOWN')).toBe(240); // Default
    });

    it('should generate booking confirmation message', () => {
        const generateConfirmation = (booking: BookingData, flightTime: number): string => {
            const formatTime = (minutes: number): string => {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours}h ${mins.toString().padStart(2, '0')}m`;
            };

            return `
🎯 **Booking Request Submitted**

**Flight Details:**
• Route: ${booking.departure} → ${booking.arrival}
• Date: ${booking.date}
• Passengers: ${booking.passengers}
• Estimated Flight Time: ${formatTime(flightTime)}

**Aircraft Preference:** ${booking.aircraft || 'Best Available'}

${booking.specialRequests ? `**Special Requests:** ${booking.specialRequests}` : ''}

Your booking request has been submitted to our charter network. You'll receive aircraft options and pricing within 30 minutes.

*Reference: BK${Date.now().toString().slice(-6)}*
      `.trim();
        };

        const booking: BookingData = {
            departure: 'KJFK',
            arrival: 'KLAX',
            date: '2025-12-01',
            passengers: 4,
            aircraft: 'Gulfstream G650',
            specialRequests: 'Vegetarian catering',
        };

        const confirmation = generateConfirmation(booking, 350);

        expect(confirmation).toContain('Booking Request Submitted');
        expect(confirmation).toContain('KJFK → KLAX');
        expect(confirmation).toContain('4');
        expect(confirmation).toContain('5h 50m');
        expect(confirmation).toContain('Gulfstream G650');
        expect(confirmation).toContain('Vegetarian catering');
        expect(confirmation).toContain('BK');
    });

    it('should handle booking wizard steps', () => {
        interface WizardState {
            currentStep: number;
            data: Partial<BookingData>;
            isComplete: boolean;
        }

        const initializeWizard = (): WizardState => ({
            currentStep: 1,
            data: {},
            isComplete: false,
        });

        const updateWizardStep = (
            state: WizardState,
            stepData: Partial<BookingData>
        ): WizardState => {
            const newData = { ...state.data, ...stepData };
            const nextStep = state.currentStep + 1;

            // Check if wizard is complete
            const requiredFields = ['departure', 'arrival', 'date', 'passengers'];
            const isComplete = requiredFields.every(field => newData[field as keyof BookingData]);

            return {
                currentStep: isComplete ? state.currentStep : nextStep,
                data: newData,
                isComplete,
            };
        };

        // Initialize wizard
        let wizard = initializeWizard();
        expect(wizard.currentStep).toBe(1);
        expect(wizard.isComplete).toBe(false);

        // Step 1: Route
        wizard = updateWizardStep(wizard, { departure: 'KJFK', arrival: 'KLAX' });
        expect(wizard.currentStep).toBe(2);
        expect(wizard.isComplete).toBe(false);

        // Step 2: Date
        wizard = updateWizardStep(wizard, { date: '2025-12-01' });
        expect(wizard.currentStep).toBe(3);
        expect(wizard.isComplete).toBe(false);

        // Step 3: Passengers (completes required fields)
        wizard = updateWizardStep(wizard, { passengers: 4 });
        expect(wizard.isComplete).toBe(true);
        expect(wizard.data.departure).toBe('KJFK');
        expect(wizard.data.passengers).toBe(4);
    });
});

describe('Booking Integration with N8N', () => {
    it('should create booking workflow message', () => {
        const createBookingMessage = (booking: BookingData): string => {
            return `Please search for private jet options for the following booking:

Route: ${booking.departure} to ${booking.arrival}
Date: ${booking.date}
Passengers: ${booking.passengers}
${booking.aircraft ? `Preferred Aircraft: ${booking.aircraft}` : ''}
${booking.specialRequests ? `Special Requests: ${booking.specialRequests}` : ''}

Please provide available aircraft options with pricing and departure times.`;
        };

        const booking: BookingData = {
            departure: 'KJFK',
            arrival: 'KLAX',
            date: '2025-12-01',
            passengers: 4,
            aircraft: 'Gulfstream G650',
        };

        const message = createBookingMessage(booking);

        expect(message).toContain('private jet options');
        expect(message).toContain('KJFK to KLAX');
        expect(message).toContain('2025-12-01');
        expect(message).toContain('4');
        expect(message).toContain('Gulfstream G650');
        expect(message).toContain('pricing');
    });

    it('should detect booking response from N8N', () => {
        const isBookingResponse = (text: string): boolean => {
            const bookingKeywords = [
                'aircraft available',
                'flight options',
                'charter quote',
                'departure time',
                'hourly rate',
                'total cost',
                'aircraft: ',
                'price: $',
            ];

            const lowerText = text.toLowerCase();
            return bookingKeywords.some(keyword => lowerText.includes(keyword));
        };

        const bookingResponse =
            'Available aircraft: Gulfstream G650, Price: $8,500/hour, Departure: 2:00 PM';
        const generalResponse = 'Here is some general information about aviation.';

        expect(isBookingResponse(bookingResponse)).toBe(true);
        expect(isBookingResponse(generalResponse)).toBe(false);
        expect(isBookingResponse('Flight options available for your route')).toBe(true);
        expect(isBookingResponse('Charter quote: $45,000 total')).toBe(true);
    });
});
