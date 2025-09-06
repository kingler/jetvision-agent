import React from 'react';
import { cn } from '@repo/ui';
import {
    IconTrendingUp,
    IconTrendingDown,
    IconMail,
    IconEye,
    IconClick,
    IconUserCheck,
    IconCurrencyDollar,
    IconChartBar,
} from '@tabler/icons-react';

interface MetricCardProps {
    label: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    change,
    icon: Icon,
    color = 'text-brand',
}) => {
    const isPositive = change && change > 0;
    const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown;
    const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

    return (
        <div className="border-border bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
                <Icon size={20} className={cn('opacity-70', color)} />
                {change !== undefined && (
                    <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
                        <TrendIcon size={16} />
                        <span>{Math.abs(change)}%</span>
                    </div>
                )}
            </div>
            <div className="mt-3">
                <div className="text-foreground text-2xl font-bold">{value}</div>
                <div className="text-muted-foreground text-xs">{label}</div>
            </div>
        </div>
    );
};

interface CampaignMetricsProps {
    campaignName: string;
    dateRange: string;
    totalSent: number;
    opened: number;
    clicked: number;
    responded: number;
    conversions: number;
    revenue: number;
    costPerLead: number;
    roi: number;
    topPerformers?: Array<{
        name: string;
        company: string;
        score: number;
    }>;
    className?: string;
}

export const CampaignMetricsPanel: React.FC<CampaignMetricsProps> = ({
    campaignName,
    dateRange,
    totalSent,
    opened,
    clicked,
    responded,
    conversions,
    revenue,
    costPerLead,
    roi,
    topPerformers = [],
    className,
}) => {
    const openRate = ((opened / totalSent) * 100).toFixed(1);
    const clickRate = ((clicked / opened) * 100).toFixed(1);
    const responseRate = ((responded / totalSent) * 100).toFixed(1);
    const conversionRate = ((conversions / totalSent) * 100).toFixed(1);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="border-border from-secondary rounded-lg border bg-gradient-to-r to-transparent p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-foreground text-xl font-bold">{campaignName}</h3>
                        <p className="text-muted-foreground text-sm">{dateRange}</p>
                    </div>
                    <IconChartBar size={32} className="text-brand opacity-50" />
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                    label="Open Rate"
                    value={`${openRate}%`}
                    change={12}
                    icon={IconEye}
                    color="text-blue-600"
                />
                <MetricCard
                    label="Click Rate"
                    value={`${clickRate}%`}
                    change={-5}
                    icon={IconClick}
                    color="text-purple-600"
                />
                <MetricCard
                    label="Response Rate"
                    value={`${responseRate}%`}
                    change={8}
                    icon={IconMail}
                    color="text-green-600"
                />
                <MetricCard
                    label="Conversion Rate"
                    value={`${conversionRate}%`}
                    change={15}
                    icon={IconUserCheck}
                    color="text-brand"
                />
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="border-border bg-card rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-muted-foreground text-xs">Revenue Generated</div>
                            <div className="text-brand mt-1 text-2xl font-bold">
                                {formatCurrency(revenue)}
                            </div>
                        </div>
                        <IconCurrencyDollar size={24} className="text-brand opacity-50" />
                    </div>
                </div>
                <div className="border-border bg-card rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-muted-foreground text-xs">Cost Per Lead</div>
                            <div className="text-foreground mt-1 text-2xl font-bold">
                                {formatCurrency(costPerLead)}
                            </div>
                        </div>
                        <IconUserCheck size={24} className="text-muted-foreground opacity-50" />
                    </div>
                </div>
                <div className="border-border bg-card rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-muted-foreground text-xs">ROI</div>
                            <div className="mt-1 text-2xl font-bold text-green-600">{roi}%</div>
                        </div>
                        <IconTrendingUp size={24} className="text-green-600 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Campaign Stats */}
            <div className="border-border bg-card rounded-lg border p-4">
                <h4 className="text-foreground mb-3 font-semibold">Campaign Performance</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Emails Sent</span>
                        <span className="font-medium">{totalSent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Opened</span>
                        <span className="font-medium">{opened.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Clicked</span>
                        <span className="font-medium">{clicked.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Responded</span>
                        <span className="font-medium">{responded.toLocaleString()}</span>
                    </div>
                    <div className="border-border flex items-center justify-between border-t pt-3">
                        <span className="text-foreground text-sm font-semibold">Conversions</span>
                        <span className="text-brand font-bold">{conversions}</span>
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            {topPerformers.length > 0 && (
                <div className="border-border bg-card rounded-lg border p-4">
                    <h4 className="text-foreground mb-3 font-semibold">Top Prospects</h4>
                    <div className="space-y-2">
                        {topPerformers.map((performer, index) => (
                            <div
                                key={index}
                                className="bg-secondary flex items-center justify-between rounded-md p-2"
                            >
                                <div>
                                    <div className="text-foreground font-medium">
                                        {performer.name}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {performer.company}
                                    </div>
                                </div>
                                <div className="bg-brand/10 text-brand rounded-full px-2 py-1 text-sm font-bold">
                                    {performer.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
