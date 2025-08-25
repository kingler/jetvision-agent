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
    IconChartBar
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
    color = 'text-brand' 
}) => {
    const isPositive = change && change > 0;
    const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown;
    const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

    return (
        <div className="rounded-lg border border-border bg-card p-4">
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
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
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
            <div className="rounded-lg border border-border bg-gradient-to-r from-secondary to-transparent p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">{campaignName}</h3>
                        <p className="text-sm text-muted-foreground">{dateRange}</p>
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
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground">Revenue Generated</div>
                            <div className="mt-1 text-2xl font-bold text-brand">
                                {formatCurrency(revenue)}
                            </div>
                        </div>
                        <IconCurrencyDollar size={24} className="text-brand opacity-50" />
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground">Cost Per Lead</div>
                            <div className="mt-1 text-2xl font-bold text-foreground">
                                {formatCurrency(costPerLead)}
                            </div>
                        </div>
                        <IconUserCheck size={24} className="text-muted-foreground opacity-50" />
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground">ROI</div>
                            <div className="mt-1 text-2xl font-bold text-green-600">
                                {roi}%
                            </div>
                        </div>
                        <IconTrendingUp size={24} className="text-green-600 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Campaign Stats */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 font-semibold text-foreground">Campaign Performance</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Emails Sent</span>
                        <span className="font-medium">{totalSent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Opened</span>
                        <span className="font-medium">{opened.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Clicked</span>
                        <span className="font-medium">{clicked.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Responded</span>
                        <span className="font-medium">{responded.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                        <span className="text-sm font-semibold text-foreground">Conversions</span>
                        <span className="font-bold text-brand">{conversions}</span>
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            {topPerformers.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="mb-3 font-semibold text-foreground">Top Prospects</h4>
                    <div className="space-y-2">
                        {topPerformers.map((performer, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between rounded-md bg-secondary p-2"
                            >
                                <div>
                                    <div className="font-medium text-foreground">{performer.name}</div>
                                    <div className="text-xs text-muted-foreground">{performer.company}</div>
                                </div>
                                <div className="rounded-full bg-brand/10 px-2 py-1 text-sm font-bold text-brand">
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