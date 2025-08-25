import React from 'react';
import { cn } from '@repo/ui';
import { 
    IconPlane, 
    IconMapPin, 
    IconCalendar, 
    IconUsers, 
    IconClock,
    IconCurrencyDollar,
    IconStar
} from '@tabler/icons-react';

interface FlightQuoteProps {
    from: string;
    to: string;
    date: string;
    returnDate?: string;
    passengers: number;
    aircraftType: string;
    aircraftModel: string;
    flightTime: string;
    price: number;
    pricePerHour?: number;
    amenities?: string[];
    isEmptyLeg?: boolean;
    discount?: number;
    className?: string;
}

export const FlightQuoteCard: React.FC<FlightQuoteProps> = ({
    from,
    to,
    date,
    returnDate,
    passengers,
    aircraftType,
    aircraftModel,
    flightTime,
    price,
    pricePerHour,
    amenities = [],
    isEmptyLeg = false,
    discount,
    className,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-lg',
                className
            )}
        >
            {/* Empty Leg Badge */}
            {isEmptyLeg && (
                <div className="absolute right-0 top-0 z-10">
                    <div className="bg-brand px-4 py-1 text-sm font-bold text-brand-foreground">
                        EMPTY LEG {discount && `- ${discount}% OFF`}
                    </div>
                </div>
            )}

            {/* Header with Route */}
            <div className="border-b border-border bg-gradient-to-r from-secondary to-transparent p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">{from}</div>
                            <div className="text-xs text-muted-foreground">Departure</div>
                        </div>
                        <IconPlane size={24} className="text-brand" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">{to}</div>
                            <div className="text-xs text-muted-foreground">Arrival</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground">Flight Time</div>
                        <div className="flex items-center gap-1 text-lg font-semibold">
                            <IconClock size={18} />
                            {flightTime}
                        </div>
                    </div>
                </div>
            </div>

            {/* Flight Details */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconCalendar size={14} />
                            Departure
                        </div>
                        <div className="mt-1 font-medium">{date}</div>
                    </div>
                    {returnDate && (
                        <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <IconCalendar size={14} />
                                Return
                            </div>
                            <div className="mt-1 font-medium">{returnDate}</div>
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconUsers size={14} />
                            Passengers
                        </div>
                        <div className="mt-1 font-medium">{passengers} Seats</div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconPlane size={14} />
                            Aircraft
                        </div>
                        <div className="mt-1 font-medium">{aircraftType}</div>
                    </div>
                </div>

                {/* Aircraft Model & Amenities */}
                <div className="mt-4 rounded-md bg-secondary p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{aircraftModel}</span>
                        <div className="flex items-center gap-1 text-xs text-brand">
                            <IconStar size={14} fill="currentColor" />
                            <IconStar size={14} fill="currentColor" />
                            <IconStar size={14} fill="currentColor" />
                            <IconStar size={14} fill="currentColor" />
                            <IconStar size={14} fill="currentColor" />
                        </div>
                    </div>
                    {amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {amenities.map((amenity, index) => (
                                <span
                                    key={index}
                                    className="rounded-full bg-tertiary px-2 py-1 text-xs text-tertiary-foreground"
                                >
                                    {amenity}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pricing */}
                <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground">Total Charter Cost</div>
                            <div className="flex items-baseline gap-2">
                                {isEmptyLeg && discount && (
                                    <span className="text-lg text-muted-foreground line-through">
                                        {formatCurrency(price / (1 - discount / 100))}
                                    </span>
                                )}
                                <span className="text-3xl font-bold text-brand">
                                    {formatCurrency(price)}
                                </span>
                            </div>
                            {pricePerHour && (
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {formatCurrency(pricePerHour)}/hour
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                                Details
                            </button>
                            <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90">
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};