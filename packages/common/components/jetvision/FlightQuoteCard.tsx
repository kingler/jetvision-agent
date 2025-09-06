import React from 'react';
import { cn } from '@repo/ui';
import {
    IconPlane,
    IconMapPin,
    IconCalendar,
    IconUsers,
    IconClock,
    IconCurrencyDollar,
    IconStar,
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
                'border-border bg-card relative overflow-hidden rounded-lg border shadow-sm transition-all hover:shadow-lg',
                className
            )}
        >
            {/* Empty Leg Badge */}
            {isEmptyLeg && (
                <div className="absolute right-0 top-0 z-10">
                    <div className="bg-brand text-brand-foreground px-4 py-1 text-sm font-bold">
                        EMPTY LEG {discount && `- ${discount}% OFF`}
                    </div>
                </div>
            )}

            {/* Header with Route */}
            <div className="border-border from-secondary border-b bg-gradient-to-r to-transparent p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="text-foreground text-2xl font-bold">{from}</div>
                            <div className="text-muted-foreground text-xs">Departure</div>
                        </div>
                        <IconPlane size={24} className="text-brand" />
                        <div className="text-center">
                            <div className="text-foreground text-2xl font-bold">{to}</div>
                            <div className="text-muted-foreground text-xs">Arrival</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-muted-foreground text-xs">Flight Time</div>
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
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <IconCalendar size={14} />
                            Departure
                        </div>
                        <div className="mt-1 font-medium">{date}</div>
                    </div>
                    {returnDate && (
                        <div>
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <IconCalendar size={14} />
                                Return
                            </div>
                            <div className="mt-1 font-medium">{returnDate}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <IconUsers size={14} />
                            Passengers
                        </div>
                        <div className="mt-1 font-medium">{passengers} Seats</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                            <IconPlane size={14} />
                            Aircraft
                        </div>
                        <div className="mt-1 font-medium">{aircraftType}</div>
                    </div>
                </div>

                {/* Aircraft Model & Amenities */}
                <div className="bg-secondary mt-4 rounded-md p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-foreground text-sm font-semibold">
                            {aircraftModel}
                        </span>
                        <div className="text-brand flex items-center gap-1 text-xs">
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
                                    className="bg-tertiary text-tertiary-foreground rounded-full px-2 py-1 text-xs"
                                >
                                    {amenity}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pricing */}
                <div className="border-border mt-4 border-t pt-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-muted-foreground text-xs">Total Charter Cost</div>
                            <div className="flex items-baseline gap-2">
                                {isEmptyLeg && discount && (
                                    <span className="text-muted-foreground text-lg line-through">
                                        {formatCurrency(price / (1 - discount / 100))}
                                    </span>
                                )}
                                <span className="text-brand text-3xl font-bold">
                                    {formatCurrency(price)}
                                </span>
                            </div>
                            {pricePerHour && (
                                <div className="text-muted-foreground mt-1 text-sm">
                                    {formatCurrency(pricePerHour)}/hour
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="border-border hover:bg-secondary rounded-md border px-4 py-2 text-sm font-medium">
                                Details
                            </button>
                            <button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-md px-4 py-2 text-sm font-medium">
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
