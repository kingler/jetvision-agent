import React from 'react';
import { cn } from '@repo/ui';
import { IconBriefcase, IconMapPin, IconMail, IconPhone, IconPlane } from '@tabler/icons-react';

interface ExecutiveProfileProps {
    name: string;
    title: string;
    company: string;
    location: string;
    email?: string;
    phone?: string;
    travelFrequency?: 'High' | 'Medium' | 'Low';
    preferredAircraft?: string;
    lastContact?: string;
    apolloScore?: number;
    className?: string;
}

export const ExecutiveProfileCard: React.FC<ExecutiveProfileProps> = ({
    name,
    title,
    company,
    location,
    email,
    phone,
    travelFrequency = 'Medium',
    preferredAircraft,
    lastContact,
    apolloScore,
    className,
}) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getFrequencyColor = (frequency: string) => {
        switch (frequency) {
            case 'High':
                return 'text-brand bg-brand/10';
            case 'Medium':
                return 'text-blue-600 bg-blue-100';
            case 'Low':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md',
                className
            )}
        >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconBriefcase size={14} />
                        <span>{title}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-accent">{company}</div>
                </div>
                {apolloScore && (
                    <div className="flex flex-col items-center">
                        <span
                            className={cn(
                                'rounded-full px-3 py-1 text-sm font-bold',
                                getScoreColor(apolloScore)
                            )}
                        >
                            {apolloScore}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">Apollo Score</span>
                    </div>
                )}
            </div>

            {/* Contact Information */}
            <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-sm">
                    <IconMapPin size={14} className="text-muted-foreground" />
                    <span>{location}</span>
                </div>
                {email && (
                    <div className="flex items-center gap-2 text-sm">
                        <IconMail size={14} className="text-muted-foreground" />
                        <a href={`mailto:${email}`} className="text-accent hover:underline">
                            {email}
                        </a>
                    </div>
                )}
                {phone && (
                    <div className="flex items-center gap-2 text-sm">
                        <IconPhone size={14} className="text-muted-foreground" />
                        <span>{phone}</span>
                    </div>
                )}
            </div>

            {/* Travel Preferences */}
            <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Travel Frequency</span>
                    <span className={cn('rounded-full px-2 py-1 text-xs font-medium', getFrequencyColor(travelFrequency))}>
                        <IconPlane size={12} className="mr-1 inline" />
                        {travelFrequency}
                    </span>
                </div>
                {preferredAircraft && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Preferred Aircraft</span>
                        <span className="text-sm font-medium">{preferredAircraft}</span>
                    </div>
                )}
                {lastContact && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Contact</span>
                        <span className="text-sm">{lastContact}</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90">
                    Send Quote
                </button>
                <button className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">
                    View History
                </button>
            </div>
        </div>
    );
};