import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import { IconPlane, IconClock, IconUsers, IconCurrencyDollar, IconCalendar, IconMapPin } from '@tabler/icons-react';

interface Aircraft {
    manufacturer?: string;
    model?: string;
    fullName?: string;
    category?: string;
    passengers?: number;
    range?: number;
    speed?: number;
    hourlyRate?: string;
    availability?: boolean;
    baseLocation?: string;
}

interface BookingQuote {
    flightTime?: string;
    totalCost?: string;
    fuelSurcharge?: string;
    taxes?: string;
    positioning?: string;
    overnight?: string;
}

interface FleetStatus {
    totalAircraft?: number;
    availableNow?: number;
    inMaintenance?: number;
    onMission?: number;
}

interface AvinodeDataDisplayProps {
    type: 'aircraft_search' | 'booking_quote' | 'fleet_status';
    data: {
        aircraft?: Aircraft[];
        quote?: BookingQuote;
        fleet?: FleetStatus;
        pricing?: any;
    };
    summary?: string;
    recommendations?: string[];
}

export const AvinodeDataDisplay: React.FC<AvinodeDataDisplayProps> = ({ type, data, summary, recommendations }) => {
    if (type === 'aircraft_search' && data.aircraft) {
        return <AircraftSearchDisplay aircraft={data.aircraft} summary={summary} recommendations={recommendations} />;
    }
    
    if (type === 'booking_quote' && data.quote) {
        return <BookingQuoteDisplay quote={data.quote} pricing={data.pricing} />;
    }
    
    if (type === 'fleet_status' && data.fleet) {
        return <FleetStatusDisplay fleet={data.fleet} />;
    }
    
    return null;
};

const AircraftSearchDisplay: React.FC<{ aircraft: Aircraft[]; summary?: string; recommendations?: string[] }> = ({ 
    aircraft, 
    summary, 
    recommendations 
}) => {
    return (
        <Card className="mt-4 border-sky-500/20 bg-gradient-to-br from-sky-50/50 to-transparent dark:from-sky-950/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <IconPlane className="h-5 w-5 text-sky-600" />
                        Available Aircraft
                    </CardTitle>
                    <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                        {aircraft.length} options
                    </Badge>
                </div>
                {summary && <p className="text-sm text-muted-foreground mt-2">{summary}</p>}
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {aircraft.slice(0, 4).map((jet, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{jet.fullName || `${jet.manufacturer} ${jet.model}`}</h4>
                                    {jet.availability && (
                                        <Badge variant="secondary" className="text-xs">
                                            Available
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                                    {jet.passengers && (
                                        <span className="flex items-center gap-1">
                                            <IconUsers className="h-3 w-3" />
                                            {jet.passengers} pax
                                        </span>
                                    )}
                                    {jet.range && (
                                        <span className="flex items-center gap-1">
                                            <IconMapPin className="h-3 w-3" />
                                            {jet.range} nm
                                        </span>
                                    )}
                                    {jet.speed && (
                                        <span className="flex items-center gap-1">
                                            <IconClock className="h-3 w-3" />
                                            {jet.speed} kts
                                        </span>
                                    )}
                                    {jet.hourlyRate && (
                                        <span className="flex items-center gap-1 text-sky-600 font-medium">
                                            <IconCurrencyDollar className="h-3 w-3" />
                                            {jet.hourlyRate}/hr
                                        </span>
                                    )}
                                </div>
                                {jet.baseLocation && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Base: {jet.baseLocation}
                                    </div>
                                )}
                            </div>
                            <Button variant="outlined" size="sm">
                                Get Quote
                            </Button>
                        </div>
                    ))}
                    {aircraft.length > 4 && (
                        <div className="text-center pt-2">
                            <Button variant="outlined" size="sm">
                                View {aircraft.length - 4} more aircraft
                            </Button>
                        </div>
                    )}
                </div>
                
                {recommendations && recommendations.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Recommendations</h5>
                        <ul className="space-y-1">
                            {recommendations.map((rec, index) => (
                                <li key={index} className="text-xs text-blue-700 dark:text-blue-300">
                                    • {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const BookingQuoteDisplay: React.FC<{ quote: BookingQuote; pricing?: any }> = ({ quote, pricing }) => {
    const costs = [
        { label: 'Flight Time', value: quote.flightTime, icon: IconClock },
        { label: 'Base Cost', value: quote.totalCost, icon: IconCurrencyDollar, highlight: true },
        { label: 'Fuel Surcharge', value: quote.fuelSurcharge, icon: IconCurrencyDollar },
        { label: 'Taxes & Fees', value: quote.taxes, icon: IconCurrencyDollar },
        { label: 'Positioning', value: quote.positioning, icon: IconMapPin },
        { label: 'Overnight', value: quote.overnight, icon: IconCalendar },
    ].filter(item => item.value);
    
    const total = pricing?.quotes?.[0] || calculateTotal(quote);
    
    return (
        <Card className="mt-4 border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconCurrencyDollar className="h-5 w-5 text-emerald-600" />
                    Charter Quote
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {costs.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2 text-sm">
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                                <span className={item.highlight ? 'font-medium' : ''}>{item.label}</span>
                            </div>
                            <span className={`text-sm ${item.highlight ? 'font-bold text-emerald-600' : ''}`}>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
                {total && (
                    <div className="mt-4 pt-4 border-t-2 border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">Total Estimated Cost</span>
                            <span className="text-xl font-bold text-emerald-600">{total}</span>
                        </div>
                    </div>
                )}
                <div className="mt-4 flex gap-2">
                    <Button className="flex-1" variant="default">
                        Proceed with Booking
                    </Button>
                    <Button variant="outlined">
                        Modify Quote
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const FleetStatusDisplay: React.FC<{ fleet: FleetStatus }> = ({ fleet }) => {
    const statusItems = [
        { label: 'Total Aircraft', value: fleet.totalAircraft, color: 'blue' },
        { label: 'Available Now', value: fleet.availableNow, color: 'green' },
        { label: 'In Maintenance', value: fleet.inMaintenance, color: 'yellow' },
        { label: 'On Mission', value: fleet.onMission, color: 'purple' },
    ].filter(item => item.value !== undefined);
    
    return (
        <Card className="mt-4 border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconPlane className="h-5 w-5 text-indigo-600" />
                    Fleet Status Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statusItems.map((item, index) => (
                        <StatusCard key={index} {...item} />
                    ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                    <div className="text-sm text-indigo-700 dark:text-indigo-300">
                        Fleet utilization rate: {calculateUtilization(fleet)}%
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const StatusCard: React.FC<{ label: string; value?: number; color: string }> = ({ label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    };
    
    return (
        <div className={`rounded-lg p-3 text-center ${colorClasses[color as keyof typeof colorClasses]}`}>
            <div className="text-2xl font-bold">{value || 0}</div>
            <div className="text-xs opacity-80">{label}</div>
        </div>
    );
};

function calculateTotal(quote: BookingQuote): string | null {
    // Simple calculation logic - would be more complex in production
    const values = Object.values(quote)
        .filter(v => typeof v === 'string' && v.includes('$'))
        .map(v => parseFloat(v.replace(/[$,]/g, '')))
        .filter(v => !isNaN(v));
    
    if (values.length === 0) return null;
    const total = values.reduce((sum, val) => sum + val, 0);
    return `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculateUtilization(fleet: FleetStatus): number {
    const total = fleet.totalAircraft || 0;
    const onMission = fleet.onMission || 0;
    if (total === 0) return 0;
    return Math.round((onMission / total) * 100);
}