import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@repo/ui';
import { IconUsers, IconMail, IconChartBar, IconExternalLink, IconBriefcase, IconBuilding } from '@tabler/icons-react';

interface ApolloLead {
    name?: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    score?: number;
    tags?: string[];
}

interface ApolloMetrics {
    openRate?: string;
    clickRate?: string;
    responseRate?: string;
    conversionRate?: string;
}

interface ApolloDataDisplayProps {
    type: 'apollo_leads' | 'apollo_campaign' | 'apollo_enrichment';
    data: {
        leads?: ApolloLead[];
        metrics?: ApolloMetrics;
        enrichment?: any;
        campaign?: any;
    };
    summary?: string;
    actions?: any[];
}

export const ApolloDataDisplay: React.FC<ApolloDataDisplayProps> = ({ type, data, summary }) => {
    if (type === 'apollo_leads' && data.leads) {
        return <ApolloLeadsDisplay leads={data.leads} summary={summary} />;
    }
    
    if (type === 'apollo_campaign' && data.metrics) {
        return <ApolloCampaignDisplay metrics={data.metrics} campaign={data.campaign} />;
    }
    
    if (type === 'apollo_enrichment' && data.enrichment) {
        return <ApolloEnrichmentDisplay enrichment={data.enrichment} />;
    }
    
    return null;
};

const ApolloLeadsDisplay: React.FC<{ leads: ApolloLead[]; summary?: string }> = ({ leads, summary }) => {
    return (
        <Card className="mt-4 border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <IconUsers className="h-5 w-5 text-blue-600" />
                        Apollo.io Lead Intelligence
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {leads.length} leads found
                    </Badge>
                </div>
                {summary && <p className="text-sm text-muted-foreground mt-2">{summary}</p>}
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {leads.slice(0, 5).map((lead, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-white/50 dark:bg-gray-900/50 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{lead.name || 'Unknown'}</h4>
                                    {lead.score && (
                                        <Badge variant="outline" className="text-xs">
                                            Score: {lead.score}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    {lead.title && (
                                        <span className="flex items-center gap-1">
                                            <IconBriefcase className="h-3 w-3" />
                                            {lead.title}
                                        </span>
                                    )}
                                    {lead.company && (
                                        <span className="flex items-center gap-1">
                                            <IconBuilding className="h-3 w-3" />
                                            {lead.company}
                                        </span>
                                    )}
                                </div>
                                {lead.email && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <IconMail className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-blue-600">{lead.email}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {lead.linkedinUrl && (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <IconExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {leads.length > 5 && (
                        <div className="text-center pt-2">
                            <Button variant="outline" size="sm">
                                View {leads.length - 5} more leads
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const ApolloCampaignDisplay: React.FC<{ metrics: ApolloMetrics; campaign?: any }> = ({ metrics, campaign }) => {
    return (
        <Card className="mt-4 border-green-500/20 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconChartBar className="h-5 w-5 text-green-600" />
                    Campaign Performance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.openRate && (
                        <MetricCard label="Open Rate" value={metrics.openRate} color="blue" />
                    )}
                    {metrics.clickRate && (
                        <MetricCard label="Click Rate" value={metrics.clickRate} color="green" />
                    )}
                    {metrics.responseRate && (
                        <MetricCard label="Response Rate" value={metrics.responseRate} color="yellow" />
                    )}
                    {metrics.conversionRate && (
                        <MetricCard label="Conversion" value={metrics.conversionRate} color="purple" />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const ApolloEnrichmentDisplay: React.FC<{ enrichment: any }> = ({ enrichment }) => {
    return (
        <Card className="mt-4 border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconUsers className="h-5 w-5 text-purple-600" />
                    Contact Enrichment
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {Object.entries(enrichment).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium">{String(value)}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const MetricCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    };
    
    return (
        <div className={`rounded-lg p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
            <div className="text-xs opacity-80">{label}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    );
};